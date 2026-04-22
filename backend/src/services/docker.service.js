'use strict';

const dockerIntegration = require('@plagard/integrations/docker');
const { logAction } = require('./audit.service');
const { AppError } = require('../middlewares/error.middleware');
const logger = require('@plagard/core/src/logger');
const { hasMinimumRole, ROLES } = require('@plagard/core/src/policies');

const DOCKER_TIMEOUT_MS = Number(process.env.DOCKER_TIMEOUT_MS) || 5000;
const MAX_LOG_TAIL = 200;
const INTERNAL_CONTAINER_ID_RE = /^(?:[a-f0-9]{12}|[a-f0-9]{64}|[a-z0-9][a-z0-9_.-]{0,127})$/;
const FALLBACK_ALLOWED_CONTAINERS = [
  'plagard-backend',
  'plagard-worker',
  'plagard-mysql',
  'plagard-redis',
];

function parseAllowedContainers(value) {
  const entries = String(value || '')
    .split(',')
    .map((entry) => normalizeContainerId(entry))
    .filter(Boolean);

  return entries.length > 0 ? entries : FALLBACK_ALLOWED_CONTAINERS;
}

const ALLOWED_CONTAINERS = new Set(parseAllowedContainers(process.env.DOCKER_ALLOWED_CONTAINERS));

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

function normalizeContainerId(id) {
  return typeof id === 'string' ? id.trim().toLowerCase() : '';
}

function validateId(id) {
  const normalizedId = normalizeContainerId(id);

  if (!normalizedId || !INTERNAL_CONTAINER_ID_RE.test(normalizedId)) {
    throw new AppError('ID de container invalido', 400, 'INVALID_CONTAINER_ID');
  }

  return normalizedId;
}

function normalizeContainerName(name) {
  return normalizeContainerId(String(name || '').replace(/^\//, ''));
}

function extractCandidateNames(container) {
  const names = new Set();

  if (Array.isArray(container?.names)) {
    container.names.forEach((name) => names.add(normalizeContainerName(name)));
  }

  if (container?.name) {
    names.add(normalizeContainerName(container.name));
  }

  if (Array.isArray(container?.Names)) {
    container.Names.forEach((name) => names.add(normalizeContainerName(name)));
  }

  if (container?.Name) {
    names.add(normalizeContainerName(container.Name));
  }

  return Array.from(names).filter(Boolean);
}

function getContainerRef(container) {
  return normalizeContainerId(container?.fullId || container?.Id || '');
}

function isAllowedContainer(container) {
  const candidateNames = extractCandidateNames(container);
  const containerRef = getContainerRef(container);

  return candidateNames.some((name) => ALLOWED_CONTAINERS.has(name)) || ALLOWED_CONTAINERS.has(containerRef);
}

function getAuditContext({ user, container, action, ip, timestamp = new Date().toISOString(), status, error }) {
  const containerName = extractCandidateNames(container)[0] || null;
  const fullId = getContainerRef(container) || null;

  return {
    userId: user?.id ?? null,
    role: user?.role ?? null,
    container: containerName || fullId,
    action,
    ipAddress: ip || null,
    timestamp,
    resource: containerName || fullId,
    payload: {
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

function ensureContainerAllowed(container, requestedId) {
  if (isAllowedContainer(container)) return container;

  logger.warn('Blocked access to non-whitelisted container', {
    requestedId,
    containerId: getContainerRef(container) || requestedId,
    containerNames: extractCandidateNames(container),
  });

  throw new AppError('Container nao permitido', 403, 'CONTAINER_NOT_ALLOWED');
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

async function resolveAllowedContainer(id) {
  const container = await dockerIntegration.inspectContainer(id);
  return ensureContainerAllowed(container, id);
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

async function listContainers({ all = false, user } = {}) {
  ensureRole(user, ROLES.VIEWER, 'docker.container.list');
  logger.info('docker.listContainers', { userId: user?.id, all });

  try {
    const containers = await withTimeout(dockerIntegration.listContainers({ all }), DOCKER_TIMEOUT_MS);
    const allowedContainers = containers.filter(isAllowedContainer);

    logger.info('Containers listed', {
      userId: user?.id,
      count: allowedContainers.length,
      filteredOut: containers.length - allowedContainers.length,
    });

    return allowedContainers;
  } catch (err) {
    logger.error('Failed listing containers', { error: err.message });
    throw mapDockerError(err);
  }
}

async function getContainer({ id, user }) {
  const normalizedId = validateId(id);
  ensureRole(user, ROLES.VIEWER, 'docker.container.inspect', normalizedId);
  logger.info('docker.inspectContainer', { containerId: normalizedId, userId: user?.id });

  try {
    return await withTimeout(resolveAllowedContainer(normalizedId), DOCKER_TIMEOUT_MS);
  } catch (err) {
    throw mapDockerError(err);
  }
}

async function startContainer({ id, user, ip }) {
  const normalizedId = validateId(id);
  ensureRole(user, ROLES.ADMIN, 'docker.container.start', normalizedId);
  logger.info('docker.startContainer', { containerId: normalizedId, userId: user?.id });

  let container = null;

  try {
    container = await withTimeout(resolveAllowedContainer(normalizedId), DOCKER_TIMEOUT_MS);
    await withTimeout(dockerIntegration.startContainer(normalizedId), DOCKER_TIMEOUT_MS);

    logger.info('Container started successfully', { containerId: normalizedId, userId: user?.id });
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

async function stopContainer({ id, timeout = 10, user, ip }) {
  const normalizedId = validateId(id);
  ensureRole(user, ROLES.ADMIN, 'docker.container.stop', normalizedId);

  const safeTimeout = Math.min(Math.max(1, Number(timeout) || 10), 60);
  logger.info('docker.stopContainer', { containerId: normalizedId, userId: user?.id, timeout: safeTimeout });

  let container = null;

  try {
    container = await withTimeout(resolveAllowedContainer(normalizedId), DOCKER_TIMEOUT_MS);
    await withTimeout(dockerIntegration.stopContainer(normalizedId, { timeout: safeTimeout }), DOCKER_TIMEOUT_MS);

    logger.info('Container stopped successfully', { containerId: normalizedId, userId: user?.id });
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

async function restartContainer({ id, timeout = 10, user, ip }) {
  const normalizedId = validateId(id);
  ensureRole(user, ROLES.ADMIN, 'docker.container.restart', normalizedId);

  const safeTimeout = Math.min(Math.max(1, Number(timeout) || 10), 60);
  logger.info('docker.restartContainer', { containerId: normalizedId, userId: user?.id, timeout: safeTimeout });

  let container = null;

  try {
    container = await withTimeout(resolveAllowedContainer(normalizedId), DOCKER_TIMEOUT_MS);
    await withTimeout(dockerIntegration.restartContainer(normalizedId, { timeout: safeTimeout }), DOCKER_TIMEOUT_MS);

    logger.info('Container restarted successfully', { containerId: normalizedId, userId: user?.id });
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

async function getContainerLogs({ id, tail = 100, timestamps = false, user, ip }) {
  const normalizedId = validateId(id);
  ensureRole(user, ROLES.OPERATOR, 'docker.container.logs', normalizedId);

  const safeTail = Math.min(Math.max(1, Number(tail) || 100), MAX_LOG_TAIL);
  logger.info('docker.getContainerLogs', { containerId: normalizedId, userId: user?.id, tail: safeTail });

  let container = null;

  try {
    container = await withTimeout(resolveAllowedContainer(normalizedId), DOCKER_TIMEOUT_MS);
    const logs = await withTimeout(dockerIntegration.getContainerLogs(normalizedId, {
      tail: safeTail,
      timestamps: timestamps === true || timestamps === 'true',
    }), DOCKER_TIMEOUT_MS);

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
};
