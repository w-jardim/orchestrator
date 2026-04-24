'use strict';

const dockerIntegration = require('../config/plagard-core-shim').integrations.docker;
const { logAction } = require('./audit.service');
const { AppError } = require('../middlewares/error.middleware');
const logger = require('../config/plagard-core-shim').logger;
const { hasMinimumRole, ROLES } = require('../config/plagard-core-shim').policies;

const DOCKER_TIMEOUT_MS = Number(process.env.DOCKER_TIMEOUT_MS) || 5000;
const DOCKER_BUILD_TIMEOUT_MS = Number(process.env.DOCKER_BUILD_TIMEOUT_MS) || 120000;
const DOCKER_RETRY_COUNT = Number(process.env.DOCKER_RETRY_COUNT) || 2;
const DOCKER_RETRY_DELAY_MS = Number(process.env.DOCKER_RETRY_DELAY_MS) || 300;

const DOCKER_IMAGE_RE = /^(?:(?:[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?(?::[0-9]+)?\/)*[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?)(?::[\w][\w.-]{0,127})?$/i;
const ALLOWED_IMAGES = new Set(
  (process.env.DOCKER_ALLOWED_IMAGES || '')
    .split(',')
    .map((img) => img.trim())
    .filter(Boolean)
);

function normalizeImage(image) {
  return String(image || '').trim();
}

function validateImage(image) {
  const normalized = normalizeImage(image);
  if (!DOCKER_IMAGE_RE.test(normalized)) {
    throw new AppError('Imagem Docker inválida', 422, 'INVALID_DOCKER_IMAGE');
  }
  return normalized;
}

function ensureAllowedImage(image) {
  if (ALLOWED_IMAGES.size === 0 || ALLOWED_IMAGES.has(image)) return;
  throw new AppError('Imagem Docker não permitida', 403, 'IMAGE_NOT_ALLOWED');
}

function ensureRole(user, requiredRole, action, imageId) {
  if (hasMinimumRole(user?.role, requiredRole)) return;

  logger.warn('Forbidden Docker image action', {
    userId: user?.id ?? null,
    role: user?.role ?? null,
    requiredRole,
    action,
    imageId,
  });

  throw new AppError('Acesso negado', 403, 'FORBIDDEN');
}

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const timeoutError = new Error('Docker call timeout');
      timeoutError.code = 'DOCKER_TIMEOUT';
      reject(timeoutError);
    }, ms);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableDockerError(err) {
  return ['DOCKER_TIMEOUT', 'ECONNRESET', 'EPIPE', 'ETIMEDOUT', 'ECONNREFUSED'].includes(err?.code) || err?.statusCode >= 500;
}

async function withDockerRetry(action, operation, { retries = DOCKER_RETRY_COUNT } = {}) {
  let attempt = 0;
  let lastError = null;

  while (attempt <= retries) {
    try {
      return await operation();
    } catch (err) {
      lastError = err;
      if (attempt >= retries || !isRetryableDockerError(err)) {
        throw err;
      }

      logger.warn('Retrying Docker operation', {
        action,
        attempt: attempt + 1,
        error: err.message,
        code: err.code,
      });
      await delay(DOCKER_RETRY_DELAY_MS * (attempt + 1));
      attempt += 1;
    }
  }

  throw lastError;
}

function mapDockerError(err) {
  if (err instanceof AppError) return err;
  if (err.statusCode === 404) return new AppError('Imagem não encontrada', 404, 'IMAGE_NOT_FOUND');
  if (err.statusCode === 409) return new AppError('Conflito: imagem em uso', 409, 'IMAGE_CONFLICT');
  if (err.code === 'DOCKER_TIMEOUT') {
    return new AppError('Tempo limite de comunicação com Docker excedido', 504, 'DOCKER_TIMEOUT');
  }
  if (err.code === 'EACCES' || err.code === 'ENOENT') {
    return new AppError('Docker indisponível ou sem permissão', 503, 'DOCKER_UNAVAILABLE');
  }
  return err;
}

function getAuditContext({ user, image, action, ip, timestamp = new Date().toISOString(), status, error }) {
  return {
    tenantId: user?.tenant_id ?? null,
    userId: user?.id ?? null,
    role: user?.role ?? null,
    image,
    action,
    ipAddress: ip || null,
    timestamp,
    resource: image,
    payload: {
      tenantId: user?.tenant_id ?? null,
      userId: user?.id ?? null,
      role: user?.role ?? null,
      image,
      ip: ip || null,
      action,
      timestamp,
      ...(error ? { error } : {}),
    },
    status,
  };
}

function normalizeImage(img) {
  return {
    id: img.Id || img.id || '',
    repoTags: img.RepoTags || img.repoTags || [],
    repoDigests: img.RepoDigests || img.repoDigests || [],
    size: img.Size || img.size || 0,
    virtualSize: img.VirtualSize || img.virtualSize || 0,
    created: img.Created || img.created || 0,
    sharedSize: img.SharedSize || img.sharedSize || 0,
  };
}

async function listImages({ user, ip } = {}) {
  ensureRole(user, ROLES.VIEWER, 'docker.images.list', null);

  try {
    const images = await withTimeout(withDockerRetry('docker.listImages', () => dockerIntegration.listImages()), DOCKER_TIMEOUT_MS);

    await logAction(
      getAuditContext({
        user,
        image: 'all',
        action: 'docker.images.list',
        ip,
        status: 'success',
      })
    );

    return (images || []).map(normalizeImage);
  } catch (err) {
    await logAction(
      getAuditContext({
        user,
        image: 'all',
        action: 'docker.images.list',
        ip,
        status: 'failure',
        error: mapDockerError(err).code || err.message,
      })
    );
    throw mapDockerError(err);
  }
}

async function getImage({ id, user, ip } = {}) {
  const normalizedId = validateImage(id);
  ensureRole(user, ROLES.VIEWER, 'docker.images.inspect', normalizedId);

  try {
    const image = await withTimeout(withDockerRetry('docker.inspectImage', () => dockerIntegration.inspectImage(normalizedId)), DOCKER_TIMEOUT_MS);

    await logAction(
      getAuditContext({
        user,
        image: normalizedId,
        action: 'docker.images.inspect',
        ip,
        status: 'success',
      })
    );

    return image;
  } catch (err) {
    await logAction(
      getAuditContext({
        user,
        image: normalizedId,
        action: 'docker.images.inspect',
        ip,
        status: 'failure',
        error: mapDockerError(err).code || err.message,
      })
    );
    throw mapDockerError(err);
  }
}

async function pullImage({ image, user, ip } = {}) {
  const normalizedImage = validateImage(image);
  ensureAllowedImage(normalizedImage);
  ensureRole(user, ROLES.ADMIN, 'docker.images.pull', normalizedImage);

  try {
    const result = await withTimeout(
      withDockerRetry('docker.pullImage', () => dockerIntegration.pullImage(normalizedImage)),
      DOCKER_BUILD_TIMEOUT_MS
    );

    await logAction(
      getAuditContext({
        user,
        image: normalizedImage,
        action: 'docker.images.pull',
        ip,
        status: 'success',
      })
    );

    return result;
  } catch (err) {
    await logAction(
      getAuditContext({
        user,
        image: normalizedImage,
        action: 'docker.images.pull',
        ip,
        status: 'failure',
        error: mapDockerError(err).code || err.message,
      })
    );
    throw mapDockerError(err);
  }
}

async function deleteImage({ id, force = false, user, ip } = {}) {
  const normalizedId = validateImage(id);
  ensureRole(user, ROLES.ADMIN, 'docker.images.delete', normalizedId);

  try {
    await withTimeout(withDockerRetry('docker.removeImage', () => dockerIntegration.removeImage(normalizedId, { force })), DOCKER_TIMEOUT_MS);

    await logAction(
      getAuditContext({
        user,
        image: normalizedId,
        action: 'docker.images.delete',
        ip,
        status: 'success',
      })
    );

    return { success: true, image: normalizedId };
  } catch (err) {
    await logAction(
      getAuditContext({
        user,
        image: normalizedId,
        action: 'docker.images.delete',
        ip,
        status: 'failure',
        error: mapDockerError(err).code || err.message,
      })
    );
    throw mapDockerError(err);
  }
}

module.exports = {
  listImages,
  getImage,
  pullImage,
  deleteImage,
};
