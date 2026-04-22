'use strict';

const dockerIntegration = require('@plagard/integrations/docker');
const { logAction } = require('./audit.service');
const { AppError } = require('../middlewares/error.middleware');
const logger = require('@plagard/core/src/logger');
const { hasMinimumRole, ROLES } = require('@plagard/core/src/policies');

const DOCKER_TIMEOUT_MS = Number(process.env.DOCKER_TIMEOUT_MS) || 5000;
const DOCKER_RUN_TIMEOUT_MS = Number(process.env.DOCKER_RUN_TIMEOUT_MS) || Math.max(DOCKER_TIMEOUT_MS, 30000);
const DOCKER_RETRY_COUNT = Number(process.env.DOCKER_RETRY_COUNT) || 2;
const DOCKER_RETRY_DELAY_MS = Number(process.env.DOCKER_RETRY_DELAY_MS) || 300;
const MAX_LOG_TAIL = 200;
const INTERNAL_CONTAINER_ID_RE = /^(?:[a-f0-9]{12}|[a-f0-9]{64}|[a-z0-9][a-z0-9_.-]{0,127})$/;
const CONTAINER_NAME_RE = /^[a-z0-9][a-z0-9_.-]{2,190}$/;
const DOCKER_IMAGE_RE = /^(?:(?:[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?(?::[0-9]+)?\/)*[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?)(?::[\w][\w.-]{0,127})?$/i;
const FALLBACK_ALLOWED_CONTAINERS = [
  'plagard-backend',
  'plagard-worker',
  'plagard-mysql',
  'plagard-redis',
];

function parseEnvList(value) {
  return String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeContainerId(id) {
  return typeof id === 'string' ? id.trim().toLowerCase() : '';
}

function normalizeImage(image) {
  return String(image || '').trim();
}

function parseAllowedContainers(value) {
  const entries = parseEnvList(value)
    .map((entry) => normalizeContainerId(entry))
    .filter(Boolean);

  return entries.length > 0 ? entries : FALLBACK_ALLOWED_CONTAINERS;
}

const ALLOWED_CONTAINERS = new Set(parseAllowedContainers(process.env.DOCKER_ALLOWED_CONTAINERS));
const ALLOWED_IMAGES = new Set(parseEnvList(process.env.DOCKER_ALLOWED_IMAGES).map((entry) => normalizeImage(entry)));

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
  return [
    'DOCKER_TIMEOUT',
    'ECONNRESET',
    'EPIPE',
    'ETIMEDOUT',
    'ECONNREFUSED',
  ].includes(err?.code) || err?.statusCode >= 500;
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

function validateId(id) {
  const normalizedId = normalizeContainerId(id);
  if (!normalizedId || !INTERNAL_CONTAINER_ID_RE.test(normalizedId)) {
    throw new AppError('ID de container invalido', 400, 'INVALID_CONTAINER_ID');
  }
  return normalizedId;
}

function validateContainerName(name) {
  const normalizedName = normalizeContainerId(name);
  if (!CONTAINER_NAME_RE.test(normalizedName)) {
    throw new AppError('Nome de container invalido', 422, 'INVALID_CONTAINER_NAME');
  }
  return normalizedName;
}

function validateContainerRef(id) {
  const normalized = normalizeContainerId(id);
  if (!normalized) {
    throw new AppError('ID de container invalido', 400, 'INVALID_CONTAINER_ID');
  }

  if (INTERNAL_CONTAINER_ID_RE.test(normalized)) {
    return normalized;
  }

  if (CONTAINER_NAME_RE.test(normalized)) {
    return normalized;
  }

  throw new AppError('ID de container invalido', 400, 'INVALID_CONTAINER_ID');
}

function validateImage(image) {
  const normalizedImage = normalizeImage(image);
  if (!DOCKER_IMAGE_RE.test(normalizedImage)) {
    throw new AppError('Imagem Docker invalida', 422, 'INVALID_DOCKER_IMAGE');
  }
  return normalizedImage;
}

function ensureAllowedImage(image) {
  if (ALLOWED_IMAGES.size === 0 || ALLOWED_IMAGES.has(image)) return;
  throw new AppError('Imagem Docker nao permitida', 403, 'IMAGE_NOT_ALLOWED');
}

function normalizeContainerName(name) {
  return normalizeContainerId(String(name || '').replace(/^\//, ''));
}

function extractCandidateNames(container) {
  const names = new Set();

  if (Array.isArray(container?.names)) {
    container.names.forEach((name) => names.add(normalizeContainerName(name)));
  }
  if (container?.name) names.add(normalizeContainerName(container.name));
  if (Array.isArray(container?.Names)) {
    container.Names.forEach((name) => names.add(normalizeContainerName(name)));
  }
  if (container?.Name) names.add(normalizeContainerName(container.Name));

  return Array.from(names).filter(Boolean);
}

function getContainerRef(container) {
  return normalizeContainerId(container?.fullId || container?.Id || '');
}

function getTenantPrefix(tenantId) {
  return tenantId ? `plagard-${tenantId}-` : null;
}

function resolveTenantScope(user, tenantScope) {
  if (user?.role === ROLES.ADMIN_MASTER) {
    return tenantScope?.tenantId ? Number(tenantScope.tenantId) : null;
  }

  return user?.tenant_id ? Number(user.tenant_id) : null;
}

function isInternalContainer(container) {
  const names = extractCandidateNames(container);
  const ref = getContainerRef(container);
  return names.some((name) => ALLOWED_CONTAINERS.has(name)) || ALLOWED_CONTAINERS.has(ref);
}

function isTenantContainer(container, tenantId) {
  const prefix = getTenantPrefix(tenantId);
  if (!prefix) return false;
  return extractCandidateNames(container).some((name) => name.startsWith(prefix));
}

function getAuditContext({ user, container, action, ip, timestamp = new Date().toISOString(), status, error }) {
  const containerName = extractCandidateNames(container)[0] || null;
  const fullId = getContainerRef(container) || null;

  return {
    tenantId: user?.tenant_id ?? null,
    userId: user?.id ?? null,
    role: user?.role ?? null,
    container: containerName || fullId,
    action,
    ipAddress: ip || null,
    timestamp,
    resource: containerName || fullId,
    payload: {
      tenantId: user?.tenant_id ?? null,
      userId: user?.id ?? null,
      role: user?.role ?? null,
      container: containerName,
      containerId: fullId,
      ip: ip || null,
      action,
      timestamp,
      ...(error ? { error } : {}),
    },
    status,
  };
}

function ensureRole(user, requiredRole, action, containerId) {
  if (hasMinimumRole(user?.role, requiredRole)) return;

  logger.warn('Forbidden Docker action', {
    userId: user?.id ?? null,
    role: user?.role ?? null,
    requiredRole,
    action,
    containerId,
  });

  throw new AppError('Acesso negado', 403, 'FORBIDDEN');
}

function ensureTenantContainerAccess(container, user, tenantScope, requestedId) {
  const scopedTenantId = resolveTenantScope(user, tenantScope);

  if (user?.role === ROLES.ADMIN_MASTER) {
    if (!scopedTenantId) return container;
    if (isTenantContainer(container, scopedTenantId)) return container;
    throw new AppError('Acesso negado ao tenant solicitado', 403, 'FORBIDDEN_TENANT_SCOPE');
  }

  if (!scopedTenantId) {
    throw new AppError('Escopo de tenant obrigatorio', 403, 'FORBIDDEN_TENANT_SCOPE');
  }

  if (isTenantContainer(container, scopedTenantId)) {
    return container;
  }

  logger.warn('Cross-tenant Docker access blocked', {
    userId: user?.id ?? null,
    tenantId: scopedTenantId,
    requestedId,
    containerNames: extractCandidateNames(container),
  });

  throw new AppError('Acesso negado ao tenant solicitado', 403, 'FORBIDDEN_TENANT_SCOPE');
}

async function resolveContainer(id, { user, tenantScope, requireAllowedInternal = true } = {}) {
  const container = await withDockerRetry('docker.inspect', () => dockerIntegration.inspectContainer(id));

  if (user?.role === ROLES.ADMIN_MASTER) {
    if (!tenantScope?.tenantId) return container;
    return ensureTenantContainerAccess(container, user, tenantScope, id);
  }

  if (requireAllowedInternal && isInternalContainer(container)) {
    throw new AppError('Acesso negado ao tenant solicitado', 403, 'FORBIDDEN_TENANT_SCOPE');
  }

  return ensureTenantContainerAccess(container, user, tenantScope, id);
}

async function findContainer(id, options = {}) {
  try {
    return await resolveContainer(id, options);
  } catch (err) {
    const mappedError = mapDockerError(err);
    if (mappedError.code === 'CONTAINER_NOT_FOUND') return null;
    throw mappedError;
  }
}

function mapDockerError(err) {
  if (err instanceof AppError) return err;
  if (err.statusCode === 404) return new AppError('Container nao encontrado', 404, 'CONTAINER_NOT_FOUND');
  if (err.statusCode === 304) return new AppError('Operacao sem efeito: container ja esta neste estado', 409, 'CONTAINER_STATE_CONFLICT');
  if (err.statusCode === 409) return new AppError('Conflito: container ocupado ou estado incompativel', 409, 'CONTAINER_CONFLICT');
  if (err.code === 'DOCKER_TIMEOUT') {
    return new AppError('Tempo limite de comunicacao com Docker excedido', 504, 'DOCKER_TIMEOUT');
  }
  if (err.code === 'EACCES' || err.code === 'ENOENT') {
    return new AppError('Docker indisponivel ou sem permissao no socket', 503, 'DOCKER_UNAVAILABLE');
  }
  return err;
}

function sanitizeEnv(env) {
  if (!env || typeof env !== 'object' || Array.isArray(env)) return {};

  return Object.entries(env).reduce((acc, [key, value]) => {
    const sanitizedKey = String(key || '').trim();
    if (!sanitizedKey) return acc;

    acc[sanitizedKey] = String(value ?? '').replace(/\0/g, '').trim();
    return acc;
  }, {});
}

function filterContainersForScope(containers, user, tenantScope) {
  const scopedTenantId = resolveTenantScope(user, tenantScope);

  if (user?.role === ROLES.ADMIN_MASTER) {
    if (!scopedTenantId) return containers;
    return containers.filter((container) => isTenantContainer(container, scopedTenantId));
  }

  if (!scopedTenantId) return [];
  return containers.filter((container) => isTenantContainer(container, scopedTenantId));
}

async function runContainer({ name, image, ports = [], env = {}, containerId = null, user, ip, replaceExisting = true } = {}) {
  const normalizedName = validateContainerName(name);
  const normalizedImage = validateImage(image);
  const normalizedContainerId = containerId ? validateId(containerId) : null;

  ensureAllowedImage(normalizedImage);
  ensureRole(user, ROLES.ADMIN, 'docker.container.run', normalizedName);

  try {
    const existingContainer = normalizedContainerId
      ? await withTimeout(findContainer(normalizedContainerId, {
        user,
        tenantScope: { tenantId: user?.tenant_id ?? null },
        requireAllowedInternal: false,
      }), DOCKER_RUN_TIMEOUT_MS)
      : null;

    if (existingContainer) {
      await withTimeout(withDockerRetry('docker.restart', () => dockerIntegration.restartContainer(normalizedContainerId)), DOCKER_RUN_TIMEOUT_MS);
      const restartedContainer = await withTimeout(findContainer(normalizedContainerId, {
        user,
        tenantScope: { tenantId: user?.tenant_id ?? null },
        requireAllowedInternal: false,
      }), DOCKER_RUN_TIMEOUT_MS);

      await logAction(getAuditContext({
        user,
        container: restartedContainer,
        action: 'docker.container.restart',
        ip,
        status: 'success',
      }));

      return restartedContainer;
    }

    if (replaceExisting) {
      const existingByName = await withTimeout(findContainer(normalizedName, {
        user,
        tenantScope: { tenantId: user?.tenant_id ?? null },
        requireAllowedInternal: false,
      }), DOCKER_RUN_TIMEOUT_MS);
      if (existingByName) {
        await withTimeout(withDockerRetry('docker.remove', () => dockerIntegration.removeContainer(normalizedName, { force: true })), DOCKER_RUN_TIMEOUT_MS);
      }
    }

    const container = await withTimeout(withDockerRetry('docker.run', () => dockerIntegration.runContainer({
      name: normalizedName,
      image: normalizedImage,
      ports,
      env: sanitizeEnv(env),
    })), DOCKER_RUN_TIMEOUT_MS);

    await logAction(getAuditContext({
      user,
      container,
      action: 'docker.container.run',
      ip,
      status: 'success',
    }));

    return container;
  } catch (err) {
    await logAction(getAuditContext({
      user,
      container: { fullId: normalizedContainerId || normalizedName, name: normalizedName },
      action: 'docker.container.run',
      ip,
      status: 'failure',
      error: mapDockerError(err).code || err.message,
    }));
    throw mapDockerError(err);
  }
}

async function findManagedContainer(id, { user, tenantScope } = {}) {
  const normalizedId = normalizeContainerId(id);
  if (!normalizedId) return null;

  return findContainer(normalizedId, {
    user,
    tenantScope,
    requireAllowedInternal: false,
  });
}

async function stopManagedContainer({ id, timeout = 10, user, ip }) {
  const normalizedId = validateContainerRef(id);
  ensureRole(user, ROLES.ADMIN, 'docker.container.stop.managed', normalizedId);

  const container = await findManagedContainer(normalizedId, {
    user,
    tenantScope: { tenantId: user?.tenant_id ?? null },
  });
  if (!container) throw new AppError('Container nao encontrado', 404, 'CONTAINER_NOT_FOUND');

  try {
    await withTimeout(withDockerRetry('docker.stop.managed', () => dockerIntegration.stopContainer(normalizedId, {
      timeout: Math.min(Math.max(1, Number(timeout) || 10), 60),
    })), DOCKER_TIMEOUT_MS);

    await logAction(getAuditContext({
      user,
      container,
      action: 'docker.container.stop.managed',
      ip,
      status: 'success',
    }));
  } catch (err) {
    await logAction(getAuditContext({
      user,
      container,
      action: 'docker.container.stop.managed',
      ip,
      status: 'failure',
      error: mapDockerError(err).code || err.message,
    }));
    throw mapDockerError(err);
  }
}

async function listContainers({ all = false, user, tenantScope } = {}) {
  ensureRole(user, ROLES.VIEWER, 'docker.container.list');
  logger.info('docker.listContainers', { userId: user?.id, tenantId: tenantScope?.tenantId || user?.tenant_id || null, all });

  try {
    const containers = await withTimeout(withDockerRetry('docker.list', () => dockerIntegration.listContainers({ all })), DOCKER_TIMEOUT_MS);
    const scopedContainers = filterContainersForScope(containers, user, tenantScope);

    logger.info('Containers listed', {
      userId: user?.id,
      count: scopedContainers.length,
    });

    return scopedContainers;
  } catch (err) {
    logger.error('Failed listing containers', { error: err.message });
    throw mapDockerError(err);
  }
}

async function getContainer({ id, user, tenantScope }) {
  const normalizedId = validateContainerRef(id);
  ensureRole(user, ROLES.VIEWER, 'docker.container.inspect', normalizedId);
  logger.info('docker.inspectContainer', { containerId: normalizedId, userId: user?.id });

  try {
    return await withTimeout(resolveContainer(normalizedId, { user, tenantScope }), DOCKER_TIMEOUT_MS);
  } catch (err) {
    throw mapDockerError(err);
  }
}

async function startContainer({ id, user, ip, tenantScope }) {
  const normalizedId = validateContainerRef(id);
  ensureRole(user, ROLES.ADMIN, 'docker.container.start', normalizedId);
  logger.info('docker.startContainer', { containerId: normalizedId, userId: user?.id });

  let container = null;

  try {
    container = await withTimeout(resolveContainer(normalizedId, { user, tenantScope }), DOCKER_TIMEOUT_MS);
    await withTimeout(withDockerRetry('docker.start', () => dockerIntegration.startContainer(normalizedId)), DOCKER_TIMEOUT_MS);

    await logAction(getAuditContext({
      user,
      container,
      action: 'docker.container.start',
      ip,
      status: 'success',
    }));
  } catch (err) {
    await logAction(getAuditContext({
      user,
      container: container || { fullId: normalizedId, name: normalizedId },
      action: 'docker.container.start',
      ip,
      status: 'failure',
      error: mapDockerError(err).code || err.message,
    }));
    throw mapDockerError(err);
  }
}

async function stopContainer({ id, timeout = 10, user, ip, tenantScope }) {
  const normalizedId = validateContainerRef(id);
  ensureRole(user, ROLES.ADMIN, 'docker.container.stop', normalizedId);
  const safeTimeout = Math.min(Math.max(1, Number(timeout) || 10), 60);

  let container = null;

  try {
    container = await withTimeout(resolveContainer(normalizedId, { user, tenantScope }), DOCKER_TIMEOUT_MS);
    await withTimeout(withDockerRetry('docker.stop', () => dockerIntegration.stopContainer(normalizedId, { timeout: safeTimeout })), DOCKER_TIMEOUT_MS);

    await logAction(getAuditContext({
      user,
      container,
      action: 'docker.container.stop',
      ip,
      status: 'success',
    }));
  } catch (err) {
    await logAction(getAuditContext({
      user,
      container: container || { fullId: normalizedId, name: normalizedId },
      action: 'docker.container.stop',
      ip,
      status: 'failure',
      error: mapDockerError(err).code || err.message,
    }));
    throw mapDockerError(err);
  }
}

async function restartContainer({ id, timeout = 10, user, ip, tenantScope }) {
  const normalizedId = validateContainerRef(id);
  ensureRole(user, ROLES.ADMIN, 'docker.container.restart', normalizedId);
  const safeTimeout = Math.min(Math.max(1, Number(timeout) || 10), 60);

  let container = null;

  try {
    container = await withTimeout(resolveContainer(normalizedId, { user, tenantScope }), DOCKER_TIMEOUT_MS);
    await withTimeout(withDockerRetry('docker.restart', () => dockerIntegration.restartContainer(normalizedId, { timeout: safeTimeout })), DOCKER_TIMEOUT_MS);

    await logAction(getAuditContext({
      user,
      container,
      action: 'docker.container.restart',
      ip,
      status: 'success',
    }));
  } catch (err) {
    await logAction(getAuditContext({
      user,
      container: container || { fullId: normalizedId, name: normalizedId },
      action: 'docker.container.restart',
      ip,
      status: 'failure',
      error: mapDockerError(err).code || err.message,
    }));
    throw mapDockerError(err);
  }
}

async function getContainerLogs({ id, tail = 100, timestamps = false, user, ip, tenantScope }) {
  const normalizedId = validateContainerRef(id);
  ensureRole(user, ROLES.OPERATOR, 'docker.container.logs', normalizedId);
  const safeTail = Math.min(Math.max(1, Number(tail) || 100), MAX_LOG_TAIL);

  let container = null;

  try {
    container = await withTimeout(resolveContainer(normalizedId, { user, tenantScope }), DOCKER_TIMEOUT_MS);
    const logs = await withTimeout(withDockerRetry('docker.logs', () => dockerIntegration.getContainerLogs(normalizedId, {
      tail: safeTail,
      timestamps: timestamps === true || timestamps === 'true',
    })), DOCKER_TIMEOUT_MS);

    await logAction(getAuditContext({
      user,
      container,
      action: 'docker.container.logs',
      ip,
      status: 'success',
    }));

    return logs;
  } catch (err) {
    await logAction(getAuditContext({
      user,
      container: container || { fullId: normalizedId, name: normalizedId },
      action: 'docker.container.logs',
      ip,
      status: 'failure',
      error: mapDockerError(err).code || err.message,
    }));
    throw mapDockerError(err);
  }
}

module.exports = {
  listContainers,
  getContainer,
  startContainer,
  stopContainer,
  restartContainer,
  getContainerLogs,
  runContainer,
  stopManagedContainer,
  findManagedContainer,
};
