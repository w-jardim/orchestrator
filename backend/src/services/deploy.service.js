'use strict';

const { getQueue, QUEUES, enqueueDeploy } = require('@plagard/core/src/queue');
const { hasMinimumRole, ROLES } = require('@plagard/core/src/policies');
const logger = require('@plagard/core/src/logger');
const { getDatabase } = require('../config/database');
const { logAction } = require('./audit.service');
const dockerService = require('./docker.service');
const { AppError } = require('../middlewares/error.middleware');

const TABLE = 'deploys';
const DEPLOY_STATUSES = Object.freeze({
  PENDING: 'pending',
  RUNNING: 'running',
  SUCCESS: 'success',
  FAILED: 'failed',
});
const DEPLOY_NAME_RE = /^[a-z0-9][a-z0-9_.-]{2,62}$/;
const DOCKER_IMAGE_RE = /^(?:(?:[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?(?::[0-9]+)?\/)*[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?)(?::[\w][\w.-]{0,127})?$/i;
const PORT_MAPPING_RE = /^(\d{1,5}):(\d{1,5})$/;
const ENV_KEY_RE = /^[A-Z_][A-Z0-9_]*$/i;
const MAX_ENV_VARS = Number(process.env.DEPLOY_MAX_ENV_VARS) || 50;
const MAX_CONCURRENT_DEPLOYS = Number(process.env.DEPLOY_MAX_CONCURRENT) || 3;

function getDb() {
  return getDatabase();
}

function isAdmin(user) {
  return hasMinimumRole(user?.role, ROLES.ADMIN);
}

function normalizeDeployName(name) {
  return String(name || '').trim().toLowerCase();
}

function normalizeImage(image) {
  return String(image || '').trim();
}

function parseEnvList(value) {
  return String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function safeJsonParse(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;

  try {
    return JSON.parse(value);
  } catch (_err) {
    return fallback;
  }
}

function serializeDeploy(row) {
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    image: row.image,
    status: row.status,
    containerId: row.container_id,
    ports: safeJsonParse(row.ports, []),
    env: safeJsonParse(row.env, {}),
    logs: row.logs,
    error: row.error,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function appendLog(currentLogs, message) {
  const prefix = currentLogs ? `${currentLogs}\n` : '';
  return `${prefix}[${new Date().toISOString()}] ${message}`;
}

function assertAdmin(user) {
  if (isAdmin(user)) return;
  throw new AppError('Acesso negado', 403, 'FORBIDDEN');
}

function assertCanReadDeploy(user, deploy) {
  if (!deploy) {
    throw new AppError('Deploy nao encontrado', 404, 'DEPLOY_NOT_FOUND');
  }

  if (isAdmin(user) || Number(deploy.created_by) === Number(user?.id)) {
    return;
  }

  throw new AppError('Acesso negado', 403, 'FORBIDDEN');
}

function validateDeployName(name) {
  const normalized = normalizeDeployName(name);

  if (!DEPLOY_NAME_RE.test(normalized)) {
    throw new AppError('Nome de deploy invalido', 422, 'INVALID_DEPLOY_NAME');
  }

  return normalized;
}

function validateImage(image) {
  const normalized = normalizeImage(image);

  if (!DOCKER_IMAGE_RE.test(normalized)) {
    throw new AppError('Imagem Docker invalida', 422, 'INVALID_DOCKER_IMAGE');
  }

  return normalized;
}

function validatePorts(ports) {
  if (ports == null) return [];
  if (!Array.isArray(ports)) {
    throw new AppError('Ports deve ser um array', 422, 'INVALID_PORTS');
  }

  return ports.map((entry) => {
    const value = String(entry || '').trim();
    const match = value.match(PORT_MAPPING_RE);

    if (!match) {
      throw new AppError('Porta invalida. Use HOST:CONTAINER', 422, 'INVALID_PORTS');
    }

    const hostPort = Number(match[1]);
    const containerPort = Number(match[2]);

    if (hostPort < 1 || hostPort > 65535 || containerPort < 1 || containerPort > 65535) {
      throw new AppError('Porta invalida. Intervalo permitido: 1-65535', 422, 'INVALID_PORTS');
    }

    return `${hostPort}:${containerPort}`;
  });
}

function sanitizeEnv(env) {
  if (env == null) return {};
  if (typeof env !== 'object' || Array.isArray(env)) {
    throw new AppError('Env deve ser um objeto chave/valor', 422, 'INVALID_ENV');
  }

  const entries = Object.entries(env);
  if (entries.length > MAX_ENV_VARS) {
    throw new AppError('Numero de env vars excede o limite permitido', 422, 'INVALID_ENV');
  }

  return entries.reduce((acc, [key, value]) => {
    const sanitizedKey = String(key || '').trim();

    if (!ENV_KEY_RE.test(sanitizedKey)) {
      throw new AppError('Chave de env invalida', 422, 'INVALID_ENV');
    }

    const sanitizedValue = String(value ?? '')
      .replace(/\0/g, '')
      .trim();

    acc[sanitizedKey] = sanitizedValue;
    return acc;
  }, {});
}

async function assertDeployCapacity() {
  const db = getDb();
  const result = await db(TABLE)
    .whereIn('status', [DEPLOY_STATUSES.PENDING, DEPLOY_STATUSES.RUNNING])
    .count({ count: '*' })
    .first();

  const activeCount = Number(result?.count || 0);
  if (activeCount >= MAX_CONCURRENT_DEPLOYS) {
    throw new AppError('Limite de deploys simultaneos atingido', 429, 'DEPLOY_LIMIT_REACHED');
  }
}

async function assertDeployNameAvailable(name, { replaceExisting = false } = {}) {
  if (replaceExisting) return;

  const db = getDb();
  const existing = await db(TABLE)
    .where({ name })
    .whereIn('status', [DEPLOY_STATUSES.PENDING, DEPLOY_STATUSES.RUNNING, DEPLOY_STATUSES.SUCCESS])
    .first();

  if (existing) {
    throw new AppError('Ja existe um deploy com esse nome', 409, 'DEPLOY_NAME_IN_USE');
  }
}

async function insertDeployRecord({ name, image, ports, env, createdBy }) {
  const db = getDb();
  const [id] = await db(TABLE).insert({
    name,
    image,
    status: DEPLOY_STATUSES.PENDING,
    ports: JSON.stringify(ports),
    env: JSON.stringify(env),
    created_by: createdBy,
  });

  return id;
}

async function findDeployRowById(id) {
  const db = getDb();
  return db(TABLE).where({ id }).first();
}

async function updateDeployById(id, patch) {
  const db = getDb();
  await db(TABLE).where({ id }).update(patch);
  return findDeployById(id);
}

async function markDeployRunning(id) {
  return updateDeployById(id, {
    status: DEPLOY_STATUSES.RUNNING,
    error: null,
  });
}

async function markDeploySuccess(id, { containerId, logs = null }) {
  return updateDeployById(id, {
    status: DEPLOY_STATUSES.SUCCESS,
    container_id: containerId,
    logs,
    error: null,
  });
}

async function markDeployFailed(id, { error, logs = null }) {
  return updateDeployById(id, {
    status: DEPLOY_STATUSES.FAILED,
    error,
    logs,
  });
}

async function appendDeployLogs(id, message) {
  const row = await findDeployRowById(id);
  if (!row) return null;

  return updateDeployById(id, {
    logs: appendLog(row.logs, message),
  });
}

async function findDeployById(id) {
  const row = await findDeployRowById(id);
  return serializeDeploy(row);
}

async function createDeploy({ name, image, ports, env, user, ip, replaceExisting = false }) {
  assertAdmin(user);

  const normalizedName = validateDeployName(name);
  const normalizedImage = validateImage(image);
  const normalizedPorts = validatePorts(ports);
  const normalizedEnv = sanitizeEnv(env);

  await assertDeployCapacity();
  await assertDeployNameAvailable(normalizedName, { replaceExisting });

  const deployId = await insertDeployRecord({
    name: normalizedName,
    image: normalizedImage,
    ports: normalizedPorts,
    env: normalizedEnv,
    createdBy: user.id,
  });

  await enqueueDeploy({
    deployId,
    name: normalizedName,
    image: normalizedImage,
    ports: normalizedPorts,
    env: normalizedEnv,
    ip,
    replaceExisting,
    user: {
      id: user.id,
      role: user.role,
    },
  });

  await logAction({
    userId: user.id,
    role: user.role,
    action: 'deploy_created',
    resource: String(deployId),
    container: normalizedName,
    ipAddress: ip || null,
    payload: {
      deployId,
      name: normalizedName,
      image: normalizedImage,
    },
    status: 'success',
    timestamp: new Date().toISOString(),
  });

  logger.info('Deploy created', { deployId, name: normalizedName, image: normalizedImage, userId: user.id });
  return findDeployById(deployId);
}

async function getDeploy({ id, user }) {
  const row = await findDeployRowById(id);
  assertCanReadDeploy(user, row);
  return serializeDeploy(row);
}

async function listDeploys({ user }) {
  const db = getDb();
  let query = db(TABLE).select('*').orderBy('created_at', 'desc');

  if (!isAdmin(user)) {
    query = query.where({ created_by: user.id });
  }

  const rows = await query;
  return rows.map(serializeDeploy);
}

async function stopDeploy({ id, user, ip }) {
  assertAdmin(user);

  const row = await findDeployRowById(id);
  if (!row) throw new AppError('Deploy nao encontrado', 404, 'DEPLOY_NOT_FOUND');

  if (row.status === DEPLOY_STATUSES.PENDING) {
    const queue = getQueue(QUEUES.DEPLOY);
    const job = await queue.getJob(`deploy_${row.id}`);

    if (job) {
      await job.remove();
    }

    const updated = await updateDeployById(row.id, {
      status: DEPLOY_STATUSES.FAILED,
      error: 'Deploy interrompido antes da execucao',
      logs: appendLog(row.logs, 'Deploy interrompido antes da execucao'),
    });

    await logAction({
      userId: user.id,
      role: user.role,
      action: 'deploy_stopped',
      resource: String(row.id),
      container: row.name,
      ipAddress: ip || null,
      payload: { deployId: row.id, mode: 'queue_remove' },
      status: 'success',
      timestamp: new Date().toISOString(),
    });

    return updated;
  }

  if (!row.container_id) {
    throw new AppError('Deploy sem container ativo', 409, 'DEPLOY_CONTAINER_MISSING');
  }

  await dockerService.stopManagedContainer({
    id: row.container_id,
    timeout: 10,
    user,
    ip,
  });

  const updated = await updateDeployById(row.id, {
    logs: appendLog(row.logs, 'Container parado por solicitacao do usuario'),
  });

  await logAction({
    userId: user.id,
    role: user.role,
    action: 'deploy_stopped',
    resource: String(row.id),
    container: row.name,
    ipAddress: ip || null,
    payload: { deployId: row.id, containerId: row.container_id },
    status: 'success',
    timestamp: new Date().toISOString(),
  });

  return updated;
}

async function redeploy({ id, user, ip }) {
  assertAdmin(user);

  const row = await findDeployRowById(id);
  if (!row) throw new AppError('Deploy nao encontrado', 404, 'DEPLOY_NOT_FOUND');

  const deploy = serializeDeploy(row);
  return createDeploy({
    name: deploy.name,
    image: deploy.image,
    ports: deploy.ports,
    env: deploy.env,
    user,
    ip,
    replaceExisting: true,
  });
}

module.exports = {
  DEPLOY_STATUSES,
  createDeploy,
  getDeploy,
  listDeploys,
  stopDeploy,
  redeploy,
  findDeployById,
  findDeployRowById,
  markDeployRunning,
  markDeploySuccess,
  markDeployFailed,
  appendDeployLogs,
  validateDeployName,
  validateImage,
  validatePorts,
  sanitizeEnv,
  assertDeployCapacity,
  assertDeployNameAvailable,
};
