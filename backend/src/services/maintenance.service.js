'use strict';

const dockerIntegration = require('../config/plagard-core-shim').integrations.docker;
const logger = require('../config/plagard-core-shim').logger;
const { getDatabase } = require('../config/database');
const { logAction } = require('./audit.service');
const deployService = require('./deploy.service');

const FAILED_RETENTION_HOURS = Number(process.env.DEPLOY_FAILED_RETENTION_HOURS) || 72;
const MANAGED_CONTAINER_RE = /^plagard-\d+-/;

function getDb() {
  return getDatabase();
}

function isManagedTenantContainer(container) {
  const names = []
    .concat(Array.isArray(container?.names) ? container.names : [])
    .concat(Array.isArray(container?.Names) ? container.Names : [])
    .concat(container?.name ? [container.name] : [])
    .concat(container?.Name ? [container.Name] : [])
    .map((entry) => String(entry || '').replace(/^\//, '').toLowerCase())
    .filter(Boolean);

  return names.some((name) => MANAGED_CONTAINER_RE.test(name));
}

function buildContainerIndex(containers) {
  const byName = new Map();
  const byId = new Map();

  for (const container of containers) {
    const names = []
      .concat(Array.isArray(container?.names) ? container.names : [])
      .concat(Array.isArray(container?.Names) ? container.Names : [])
      .concat(container?.name ? [container.name] : [])
      .concat(container?.Name ? [container.Name] : [])
      .map((entry) => String(entry || '').replace(/^\//, '').toLowerCase())
      .filter(Boolean);

    names.forEach((name) => byName.set(name, container));

    if (container?.fullId) byId.set(String(container.fullId).toLowerCase(), container);
    if (container?.Id) byId.set(String(container.Id).toLowerCase(), container);
    if (container?.id) byId.set(String(container.id).toLowerCase(), container);
  }

  return { byName, byId };
}

async function reconcileDeployStates() {
  const db = getDb();
  const rows = await db('deploys').select('*');
  const containers = await dockerIntegration.listContainers({ all: true });
  const managedContainers = containers.filter(isManagedTenantContainer);
  const index = buildContainerIndex(managedContainers);
  const summary = {
    scannedDeploys: rows.length,
    scannedContainers: managedContainers.length,
    recovered: 0,
    failed: 0,
    unchanged: 0,
  };

  for (const row of rows) {
    const nameKey = row.container_name ? String(row.container_name).toLowerCase() : null;
    const idKey = row.container_id ? String(row.container_id).toLowerCase() : null;
    const container = (idKey && index.byId.get(idKey)) || (nameKey && index.byName.get(nameKey)) || null;

    if (container?.state === 'running') {
      if (row.status !== deployService.DEPLOY_STATUSES.SUCCESS || row.container_id !== container.fullId) {
        await deployService.markDeploySuccess(row.id, {
          containerId: container.fullId,
          logs: row.logs,
          stageSource: 'reconcile',
        });

        await deployService.touchReconciled(row.id);
        summary.recovered += 1;
        continue;
      }

      await deployService.touchReconciled(row.id);
      summary.unchanged += 1;
      continue;
    }

    if (!container && [deployService.DEPLOY_STATUSES.RUNNING, deployService.DEPLOY_STATUSES.SUCCESS].includes(row.status)) {
      await deployService.markDeployFailed(row.id, {
        error: {
          message: 'Container ausente durante reconciliacao',
          code: 'RECONCILE_CONTAINER_MISSING',
          details: {
            deployId: row.id,
            containerId: row.container_id,
            containerName: row.container_name,
          },
        },
        logs: row.logs,
        stageSource: 'reconcile',
      });

      await deployService.touchReconciled(row.id);
      summary.failed += 1;
      continue;
    }

    await deployService.touchReconciled(row.id);
    summary.unchanged += 1;
  }

  logger.operation('Reconciliation completed', {
    action: 'system.reconcile',
    status: 'success',
    duration: null,
    ...summary,
  });

  return summary;
}

async function cleanupFailedDeploys() {
  const db = getDb();
  const cutoff = new Date(Date.now() - (FAILED_RETENTION_HOURS * 60 * 60 * 1000));
  const staleRows = await db('deploys')
    .select('id', 'tenant_id', 'created_by', 'container_name')
    .where({ status: deployService.DEPLOY_STATUSES.FAILED })
    .andWhere((query) => {
      query.where('retention_until', '<=', cutoff).orWhere('finished_at', '<=', cutoff);
    });

  if (staleRows.length === 0) {
    return { removedDeploys: 0 };
  }

  const ids = staleRows.map((row) => row.id);
  await db('deploys').whereIn('id', ids).del();

  await Promise.all(staleRows.map((row) => logAction({
    tenantId: row.tenant_id,
    userId: row.created_by,
    action: 'deploy_cleanup_deleted',
    resource: String(row.id),
    container: row.container_name,
    status: 'success',
    payload: { deployId: row.id, retentionHours: FAILED_RETENTION_HOURS },
    timestamp: new Date().toISOString(),
  })));

  return { removedDeploys: ids.length };
}

async function cleanupOrphanContainers() {
  const db = getDb();
  const rows = await db('deploys').select('container_id', 'container_name');
  const knownRefs = new Set();

  rows.forEach((row) => {
    if (row.container_id) knownRefs.add(String(row.container_id).toLowerCase());
    if (row.container_name) knownRefs.add(String(row.container_name).toLowerCase());
  });

  const containers = await dockerIntegration.listContainers({ all: true });
  const managedContainers = containers.filter(isManagedTenantContainer);
  const orphanContainers = managedContainers.filter((container) => {
    const names = []
      .concat(Array.isArray(container?.names) ? container.names : [])
      .map((entry) => String(entry || '').replace(/^\//, '').toLowerCase());

    if (container?.fullId && knownRefs.has(String(container.fullId).toLowerCase())) return false;
    return !names.some((name) => knownRefs.has(name));
  });

  for (const container of orphanContainers) {
    const ref = container.fullId || container.id || (container.names && container.names[0]);
    if (!ref) continue;
    await dockerIntegration.removeContainer(ref, { force: true });
  }

  return { removedContainers: orphanContainers.length };
}

async function runMaintenanceCycle() {
  const startedAt = Date.now();
  const reconciliation = await reconcileDeployStates();
  const cleanup = await runCleanupCycle();
  const duration = Date.now() - startedAt;

  const result = {
    reconciliation,
    cleanup,
    duration,
  };

  logger.operation('Maintenance cycle completed', {
    action: 'system.maintenance',
    status: 'success',
    duration,
    ...result,
  });

  return result;
}

async function runCleanupCycle() {
  const startedAt = Date.now();
  const failedCleanup = await cleanupFailedDeploys();
  const orphanCleanup = await cleanupOrphanContainers();
  const duration = Date.now() - startedAt;

  const result = {
    failedCleanup,
    orphanCleanup,
    duration,
  };

  logger.operation('Cleanup cycle completed', {
    action: 'system.cleanup',
    status: 'success',
    duration,
    ...result,
  });

  return result;
}

module.exports = {
  reconcileDeployStates,
  cleanupFailedDeploys,
  cleanupOrphanContainers,
  runCleanupCycle,
  runMaintenanceCycle,
};
