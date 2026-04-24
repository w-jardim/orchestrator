'use strict';

const { getQueue, QUEUES, enqueueDeploy } = require('../config/plagard-core-shim').queue;
const { hasMinimumRole, ROLES } = require('../config/plagard-core-shim').policies;
const logger = require('../config/plagard-core-shim').logger;
const { getDatabase } = require('../config/database');
const { logAction } = require('./audit.service');
const dockerService = require('./docker.service');
const {
  resolveTenantForOperation,
  getPlanLimits,
  assertTenantActive,
} = require('./tenant.service');
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
const FAILED_RETENTION_HOURS = Number(process.env.DEPLOY_FAILED_RETENTION_HOURS) || 72;

function getDb() {
  return getDatabase();
}

function isGlobalAdmin(user) {
  return user?.role === ROLES.ADMIN_MASTER;
}

function normalizeDeployName(name) {
  return String(name || '').trim().toLowerCase();
}

function normalizeImage(image) {
  return String(image || '').trim();
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

function buildContainerName(tenantId, deployName) {
  return `plagard-${tenantId}-${deployName}`;
}

function toIsoDate(value) {
  return value instanceof Date ? value.toISOString() : value;
}

function calculateDurationMs(startedAt, fallbackStartedAt = null, finishedAt = new Date()) {
  const start = startedAt || fallbackStartedAt;
  if (!start) return null;
  return Math.max(0, new Date(finishedAt).getTime() - new Date(start).getTime());
}

function buildStatusHistory(current, entry) {
  const history = safeJsonParse(current, []);
  return JSON.stringify([].concat(Array.isArray(history) ? history : [], [entry]));
}

function buildErrorSnapshot(error, details = null) {
  if (error == null) {
    return {
      message: null,
      code: null,
      details: details || null,
    };
  }

  if (typeof error === 'string') {
    return {
      message: error,
      code: null,
      details: details || null,
    };
  }

  const snapshot = {
    message: error.message || 'Erro de deploy',
    code: error.code || null,
    statusCode: error.statusCode || null,
    details: details || error.details || null,
  };

  if (error.stack) {
    snapshot.stack = String(error.stack).split('\n').slice(0, 8).join('\n');
  }

  return snapshot;
}

function serializeDeploy(row) {
  if (!row) return null;

  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    image: row.image,
    status: row.status,
    containerId: row.container_id,
    containerName: row.container_name,
    containerAlias: row.container_alias,
    ports: safeJsonParse(row.ports, []),
    env: safeJsonParse(row.env, {}),
    logs: row.logs,
    error: row.error,
    lastErrorCode: row.last_error_code || null,
    lastErrorDetails: safeJsonParse(row.last_error_details, null),
    executionDurationMs: row.execution_duration_ms == null ? null : Number(row.execution_duration_ms),
    statusHistory: safeJsonParse(row.status_history, []),
    queuedAt: toIsoDate(row.queued_at || row.created_at),
    startedAt: toIsoDate(row.started_at),
    finishedAt: toIsoDate(row.finished_at),
    reconciledAt: toIsoDate(row.reconciled_at),
    retentionUntil: toIsoDate(row.retention_until),
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function appendLog(currentLogs, message) {
  const prefix = currentLogs ? `${currentLogs}\n` : '';
  return `${prefix}[${new Date().toISOString()}] ${message}`;
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

function validatePorts(ports, planLimits = null) {
  if (ports == null) return [];
  if (!Array.isArray(ports)) {
    throw new AppError('Ports deve ser um array', 422, 'INVALID_PORTS');
  }

  const seenHostPorts = new Set();

  return ports.map((entry) => {
    const value = String(entry || '').trim();
    const match = value.match(PORT_MAPPING_RE);

    if (!match) {
      throw new AppError('Formato de porta invalido. Use HOST:CONTAINER', 400, 'INVALID_PORT_CONFIGURATION');
    }

    const hostPort = Number(match[1]);
    const containerPort = Number(match[2]);

    if (hostPort < 1 || hostPort > 65535 || containerPort < 1 || containerPort > 65535) {
      throw new AppError('Porta invalida. Intervalo permitido: 1-65535', 422, 'INVALID_PORTS');
    }

    if (seenHostPorts.has(hostPort)) {
      throw new AppError('Portas duplicadas no payload', 400, 'INVALID_PORT_CONFIGURATION');
    }

    seenHostPorts.add(hostPort);

    if (planLimits) {
      const { min, max } = planLimits.allowedPortRange;
      if (hostPort < min || hostPort > max) {
        throw new AppError('Limite do plano excedido para portas', 403, 'PLAN_LIMIT_EXCEEDED');
      }
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

    acc[sanitizedKey] = String(value ?? '').replace(/\0/g, '').trim();
    return acc;
  }, {});
}

function assertTenantScope(user, row) {
  if (!row) {
    throw new AppError('Deploy nao encontrado', 404, 'DEPLOY_NOT_FOUND');
  }

  if (isGlobalAdmin(user)) return;
  if (!user?.tenant_id || Number(row.tenant_id) !== Number(user.tenant_id)) {
    throw new AppError('Acesso negado ao tenant solicitado', 403, 'FORBIDDEN_TENANT_SCOPE');
  }
}

async function findDeployRowById(id) {
  const db = getDb();
  return db(TABLE).where({ id }).first();
}

async function findDeployById(id) {
  const row = await findDeployRowById(id);
  return serializeDeploy(row);
}

async function updateDeployById(id, patch) {
  const db = getDb();
  await db(TABLE).where({ id }).update(patch);
  return findDeployById(id);
}

async function markDeployRunning(id) {
  const row = await findDeployRowById(id);
  const startedAt = row?.started_at || new Date();

  return updateDeployById(id, {
    status: DEPLOY_STATUSES.RUNNING,
    error: null,
    last_error_code: null,
    last_error_details: null,
    started_at: startedAt,
    status_history: buildStatusHistory(row?.status_history, {
      stage: DEPLOY_STATUSES.RUNNING,
      timestamp: new Date().toISOString(),
      source: 'worker',
    }),
  });
}

async function markDeploySuccess(id, { containerId, logs = null, stageSource = 'worker' }) {
  const row = await findDeployRowById(id);
  const finishedAt = new Date();

  return updateDeployById(id, {
    status: DEPLOY_STATUSES.SUCCESS,
    container_id: containerId,
    logs,
    error: null,
    last_error_code: null,
    last_error_details: null,
    finished_at: finishedAt,
    execution_duration_ms: calculateDurationMs(row?.started_at, row?.queued_at || row?.created_at, finishedAt),
    status_history: buildStatusHistory(row?.status_history, {
      stage: DEPLOY_STATUSES.SUCCESS,
      timestamp: finishedAt.toISOString(),
      source: stageSource,
      containerId,
    }),
  });
}

async function markDeployFailed(id, { error, logs = null, stageSource = 'worker' }) {
  const row = await findDeployRowById(id);
  const finishedAt = new Date();
  const snapshot = buildErrorSnapshot(error);
  const retentionUntil = new Date(finishedAt.getTime() + (FAILED_RETENTION_HOURS * 60 * 60 * 1000));

  return updateDeployById(id, {
    status: DEPLOY_STATUSES.FAILED,
    error: snapshot.message,
    last_error_code: snapshot.code,
    last_error_details: JSON.stringify(snapshot),
    logs,
    finished_at: finishedAt,
    execution_duration_ms: calculateDurationMs(row?.started_at, row?.queued_at || row?.created_at, finishedAt),
    retention_until: retentionUntil,
    status_history: buildStatusHistory(row?.status_history, {
      stage: DEPLOY_STATUSES.FAILED,
      timestamp: finishedAt.toISOString(),
      source: stageSource,
      errorCode: snapshot.code,
      errorMessage: snapshot.message,
    }),
  });
}

async function appendDeployLogs(id, message) {
  const row = await findDeployRowById(id);
  if (!row) return null;

  return updateDeployById(id, {
    logs: appendLog(row.logs, message),
  });
}

async function touchReconciled(id) {
  return updateDeployById(id, {
    reconciled_at: new Date(),
  });
}

async function removeDeployJobIfExists(deployId) {
  const queue = getQueue(QUEUES.DEPLOY);
  const job = await queue.getJob(`deploy_${deployId}`);
  if (job) {
    await job.remove();
  }
}

async function assertDeployNameAvailable(name, tenantId, { excludeId = null } = {}) {
  const db = getDb();
  const query = db(TABLE)
    .where({ tenant_id: tenantId, name })
    .first();

  if (excludeId) {
    query.whereNot({ id: excludeId });
  }

  const existing = await query;
  if (existing) {
    throw new AppError('Ja existe um deploy com esse nome neste tenant', 409, 'DEPLOY_NAME_IN_USE');
  }
}

async function assertPlanLimits(tenant, ports, { excludeDeployId = null } = {}) {
  const db = getDb();
  const limits = getPlanLimits(tenant.plan);
  const activeStatuses = [
    DEPLOY_STATUSES.PENDING,
    DEPLOY_STATUSES.RUNNING,
    DEPLOY_STATUSES.SUCCESS,
  ];

  const activeDeploysQuery = db(TABLE)
    .where({ tenant_id: tenant.id })
    .whereIn('status', activeStatuses)
    .count({ count: '*' })
    .first();

  const activeContainersQuery = db(TABLE)
    .where({ tenant_id: tenant.id })
    .whereNotNull('container_id')
    .whereIn('status', [DEPLOY_STATUSES.RUNNING, DEPLOY_STATUSES.SUCCESS])
    .count({ count: '*' })
    .first();

  if (excludeDeployId) {
    activeDeploysQuery.whereNot({ id: excludeDeployId });
    activeContainersQuery.whereNot({ id: excludeDeployId });
  }

  const [activeDeploys, activeContainers] = await Promise.all([
    activeDeploysQuery,
    activeContainersQuery,
  ]);

  if (Number(activeDeploys?.count || 0) >= limits.maxActiveDeploys) {
    throw new AppError('Limite do plano excedido para deploys ativos', 403, 'PLAN_LIMIT_EXCEEDED');
  }

  if (Number(activeContainers?.count || 0) >= limits.maxContainers) {
    throw new AppError('Limite do plano excedido para containers ativos', 403, 'PLAN_LIMIT_EXCEEDED');
  }

  validatePorts(ports, limits);
}

async function assertPortsAvailable(ports, { excludeDeployId = null } = {}) {
  if (!Array.isArray(ports) || ports.length === 0) return;

  const hostPorts = new Set(ports.map((entry) => Number(String(entry).split(':')[0])));
  const db = getDb();
  let query = db(TABLE)
    .select('id', 'ports')
    .whereIn('status', [
      DEPLOY_STATUSES.PENDING,
      DEPLOY_STATUSES.RUNNING,
      DEPLOY_STATUSES.SUCCESS,
    ]);

  if (excludeDeployId) {
    query = query.whereNot({ id: excludeDeployId });
  }

  const rows = await query;
  const conflicting = rows.find((row) => {
    const deployedPorts = safeJsonParse(row.ports, []);
    return deployedPorts.some((entry) => hostPorts.has(Number(String(entry).split(':')[0])));
  });

  if (conflicting) {
    throw new AppError('Uma ou mais portas ja estao em uso por outro deploy', 409, 'PORT_ALREADY_IN_USE');
  }
}

async function insertDeployRecord({ tenantId, name, image, ports, env, createdBy }) {
  const db = getDb();
  const containerName = buildContainerName(tenantId, name);
  const containerAlias = name;
  const queuedAt = new Date();

  const [id] = await db(TABLE).insert({
    tenant_id: tenantId,
    name,
    image,
    status: DEPLOY_STATUSES.PENDING,
    container_name: containerName,
    container_alias: containerAlias,
    ports: JSON.stringify(ports),
    env: JSON.stringify(env),
    created_by: createdBy,
    queued_at: queuedAt,
    status_history: JSON.stringify([{
      stage: 'queued',
      timestamp: queuedAt.toISOString(),
      source: 'api',
    }]),
  });

  return id;
}

async function createDeploy({ name, image, ports, env, user, ip, tenantScope }) {
  if (!hasMinimumRole(user?.role, ROLES.ADMIN)) {
    throw new AppError('Acesso negado', 403, 'FORBIDDEN');
  }

  const tenant = await resolveTenantForOperation({
    user,
    requestedTenantId: tenantScope?.tenantId || tenantScope?.requestedTenantId,
  });

  assertTenantActive(tenant);

  const normalizedName = validateDeployName(name);
  const normalizedImage = validateImage(image);
  const normalizedEnv = sanitizeEnv(env);
  const planLimits = getPlanLimits(tenant.plan);
  const normalizedPorts = validatePorts(ports, planLimits);

  await assertPlanLimits(tenant, normalizedPorts);
  await assertDeployNameAvailable(normalizedName, tenant.id);
  await assertPortsAvailable(normalizedPorts);

  const deployId = await insertDeployRecord({
    tenantId: tenant.id,
    name: normalizedName,
    image: normalizedImage,
    ports: normalizedPorts,
    env: normalizedEnv,
    createdBy: user.id,
  });

  const deploy = await findDeployById(deployId);

  await removeDeployJobIfExists(deployId);
  await enqueueDeploy({
    deployId,
    name: deploy.containerName,
    containerName: deploy.containerName,
    image: normalizedImage,
    ports: normalizedPorts,
    env: normalizedEnv,
    ip,
    replaceExisting: false,
    user: {
      id: user.id,
      role: user.role,
      tenant_id: tenant.id,
    },
  });

  await logAction({
    tenantId: tenant.id,
    userId: user.id,
    role: user.role,
    action: 'deploy_created',
    resource: String(deployId),
    container: deploy.containerName,
    ipAddress: ip || null,
    payload: {
      deployId,
      tenantId: tenant.id,
      name: normalizedName,
      containerName: deploy.containerName,
      image: normalizedImage,
    },
    status: 'success',
    timestamp: new Date().toISOString(),
  });

  logger.info('Deploy created', {
    deployId,
    tenantId: tenant.id,
    name: normalizedName,
    containerName: deploy.containerName,
    userId: user.id,
  });

  return deploy;
}

async function getDeploy({ id, user }) {
  const row = await findDeployRowById(id);
  assertTenantScope(user, row);
  return serializeDeploy(row);
}

async function listDeploys({ user, tenantScope }) {
  const db = getDb();
  let query = db(TABLE).select('*').orderBy('created_at', 'desc');

  if (isGlobalAdmin(user)) {
    if (tenantScope?.tenantId) {
      query = query.where({ tenant_id: tenantScope.tenantId });
    }
  } else {
    query = query.where({ tenant_id: user.tenant_id });
  }

  const rows = await query;
  return rows.map(serializeDeploy);
}

async function stopDeploy({ id, user, ip }) {
  if (!hasMinimumRole(user?.role, ROLES.ADMIN)) {
    throw new AppError('Acesso negado', 403, 'FORBIDDEN');
  }

  const row = await findDeployRowById(id);
  assertTenantScope(user, row);

  if (row.status === DEPLOY_STATUSES.PENDING) {
    await removeDeployJobIfExists(row.id);

    const updated = await updateDeployById(row.id, {
      status: DEPLOY_STATUSES.FAILED,
      error: 'Deploy interrompido antes da execucao',
      logs: appendLog(row.logs, 'Deploy interrompido antes da execucao'),
    });

    await logAction({
      tenantId: row.tenant_id,
      userId: user.id,
      role: user.role,
      action: 'deploy_stopped',
      resource: String(row.id),
      container: row.container_name,
      ipAddress: ip || null,
      payload: { deployId: row.id, mode: 'queue_remove' },
      status: 'success',
      timestamp: new Date().toISOString(),
    });

    return updated;
  }

  if (!row.container_id && !row.container_name) {
    throw new AppError('Deploy sem container ativo', 409, 'DEPLOY_CONTAINER_MISSING');
  }

  await dockerService.stopManagedContainer({
    id: row.container_id || row.container_name,
    timeout: 10,
    user,
    ip,
  });

  const updated = await updateDeployById(row.id, {
    logs: appendLog(row.logs, 'Container parado por solicitacao do usuario'),
  });

  await logAction({
    tenantId: row.tenant_id,
    userId: user.id,
    role: user.role,
    action: 'deploy_stopped',
    resource: String(row.id),
    container: row.container_name,
    ipAddress: ip || null,
    payload: {
      deployId: row.id,
      containerId: row.container_id,
      containerName: row.container_name,
    },
    status: 'success',
    timestamp: new Date().toISOString(),
  });

  return updated;
}

async function redeploy({ id, user, ip }) {
  if (!hasMinimumRole(user?.role, ROLES.ADMIN)) {
    throw new AppError('Acesso negado', 403, 'FORBIDDEN');
  }

  const row = await findDeployRowById(id);
  assertTenantScope(user, row);

  const tenant = await resolveTenantForOperation({
    user,
    requestedTenantId: row.tenant_id,
    allowDefaultForGlobal: false,
  });
  assertTenantActive(tenant);

  const deploy = serializeDeploy(row);
  await assertPlanLimits(tenant, deploy.ports, { excludeDeployId: row.id });
  await assertPortsAvailable(deploy.ports, { excludeDeployId: row.id });

  await updateDeployById(row.id, {
    status: DEPLOY_STATUSES.PENDING,
    error: null,
    last_error_code: null,
    last_error_details: null,
    queued_at: new Date(),
    started_at: null,
    finished_at: null,
    execution_duration_ms: null,
    logs: appendLog(row.logs, 'Redeploy solicitado'),
    status_history: buildStatusHistory(row.status_history, {
      stage: 'queued',
      timestamp: new Date().toISOString(),
      source: 'api.redeploy',
    }),
  });

  await removeDeployJobIfExists(row.id);
  await enqueueDeploy({
    deployId: row.id,
    name: deploy.containerName,
    containerName: deploy.containerName,
    image: deploy.image,
    ports: deploy.ports,
    env: deploy.env,
    ip,
    replaceExisting: true,
    user: {
      id: user.id,
      role: user.role,
      tenant_id: row.tenant_id,
    },
  });

  return findDeployById(row.id);
}

module.exports = {
  DEPLOY_STATUSES,
  buildContainerName,
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
  touchReconciled,
  validateDeployName,
  validateImage,
  validatePorts,
  sanitizeEnv,
  assertPlanLimits,
  assertPortsAvailable,
  assertDeployNameAvailable,
};
