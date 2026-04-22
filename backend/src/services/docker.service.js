'use strict';

const dockerIntegration = require('@plagard/integrations/docker');
const { logAction } = require('./audit.service');
const { AppError } = require('../middlewares/error.middleware');
const logger = require('@plagard/core/src/logger');

// Aceita IDs curtos (12 hex), IDs completos (64 hex) e nomes de container.
// Nomes Docker: letras, números, underscores, pontos, hifens. Máx 128 chars.
const CONTAINER_ID_RE = /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/;

function validateId(id) {
  if (!id || typeof id !== 'string' || !CONTAINER_ID_RE.test(id)) {
    throw new AppError('ID de container inválido', 400, 'INVALID_CONTAINER_ID');
  }
}

function mapDockerError(err, id) {
  if (err.statusCode === 404) return new AppError('Container não encontrado', 404, 'CONTAINER_NOT_FOUND');
  if (err.statusCode === 304) return new AppError('Operação sem efeito: container já está neste estado', 409, 'CONTAINER_STATE_CONFLICT');
  if (err.statusCode === 409) return new AppError('Conflito: container ocupado ou estado incompatível', 409, 'CONTAINER_CONFLICT');
  if (err.code === 'ENOENT' || err.code === 'EACCES') {
    return new AppError('Docker socket indisponível ou sem permissão', 503, 'DOCKER_UNAVAILABLE');
  }
  return err;
}

// ─── LIST ─────────────────────────────────────────────────────────────────────

async function listContainers({ all = false, user } = {}) {
  logger.info('docker.listContainers', { userId: user?.id, all });
  const containers = await dockerIntegration.listContainers({ all });
  logger.info('Containers listed', { userId: user?.id, count: containers.length });
  return containers;
}

// ─── INSPECT ──────────────────────────────────────────────────────────────────

async function getContainer({ id, user }) {
  validateId(id);
  logger.info('docker.inspectContainer', { containerId: id, userId: user?.id });
  try {
    return await dockerIntegration.inspectContainer(id);
  } catch (err) {
    throw mapDockerError(err, id);
  }
}

// ─── START ────────────────────────────────────────────────────────────────────

async function startContainer({ id, user, ip }) {
  validateId(id);
  logger.info('docker.startContainer', { containerId: id, userId: user?.id });
  try {
    await dockerIntegration.startContainer(id);
    logger.info('Container started successfully', { containerId: id, userId: user?.id });
    await logAction({
      userId: user?.id,
      action: 'docker.container.start',
      resource: id,
      payload: { containerId: id },
      status: 'success',
      ipAddress: ip,
    });
  } catch (err) {
    await logAction({
      userId: user?.id,
      action: 'docker.container.start',
      resource: id,
      payload: { containerId: id, error: err.message },
      status: 'failure',
      ipAddress: ip,
    });
    throw mapDockerError(err, id);
  }
}

// ─── STOP ─────────────────────────────────────────────────────────────────────

async function stopContainer({ id, timeout = 10, user, ip }) {
  validateId(id);
  const safeTimeout = Math.min(Math.max(1, Number(timeout) || 10), 60);
  logger.info('docker.stopContainer', { containerId: id, userId: user?.id, timeout: safeTimeout });
  try {
    await dockerIntegration.stopContainer(id, { timeout: safeTimeout });
    logger.info('Container stopped successfully', { containerId: id, userId: user?.id });
    await logAction({
      userId: user?.id,
      action: 'docker.container.stop',
      resource: id,
      payload: { containerId: id, timeout: safeTimeout },
      status: 'success',
      ipAddress: ip,
    });
  } catch (err) {
    await logAction({
      userId: user?.id,
      action: 'docker.container.stop',
      resource: id,
      payload: { containerId: id, error: err.message },
      status: 'failure',
      ipAddress: ip,
    });
    throw mapDockerError(err, id);
  }
}

// ─── RESTART ──────────────────────────────────────────────────────────────────

async function restartContainer({ id, timeout = 10, user, ip }) {
  validateId(id);
  const safeTimeout = Math.min(Math.max(1, Number(timeout) || 10), 60);
  logger.info('docker.restartContainer', { containerId: id, userId: user?.id, timeout: safeTimeout });
  try {
    await dockerIntegration.restartContainer(id, { timeout: safeTimeout });
    logger.info('Container restarted successfully', { containerId: id, userId: user?.id });
    await logAction({
      userId: user?.id,
      action: 'docker.container.restart',
      resource: id,
      payload: { containerId: id, timeout: safeTimeout },
      status: 'success',
      ipAddress: ip,
    });
  } catch (err) {
    await logAction({
      userId: user?.id,
      action: 'docker.container.restart',
      resource: id,
      payload: { containerId: id, error: err.message },
      status: 'failure',
      ipAddress: ip,
    });
    throw mapDockerError(err, id);
  }
}

// ─── LOGS ─────────────────────────────────────────────────────────────────────

async function getContainerLogs({ id, tail = 100, timestamps = false, user, ip }) {
  validateId(id);
  const safeTail = Math.min(Math.max(1, Number(tail) || 100), 500);
  logger.info('docker.getContainerLogs', { containerId: id, userId: user?.id, tail: safeTail });
  try {
    const logs = await dockerIntegration.getContainerLogs(id, {
      tail: safeTail,
      timestamps: timestamps === true || timestamps === 'true',
    });
    await logAction({
      userId: user?.id,
      action: 'docker.container.logs',
      resource: id,
      payload: { containerId: id, tail: safeTail },
      status: 'success',
      ipAddress: ip,
    });
    return logs;
  } catch (err) {
    throw mapDockerError(err, id);
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
