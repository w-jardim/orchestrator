'use strict';

const logger = require('@plagard/core/src/logger');
const dockerIntegration = require('@plagard/integrations/docker');
const dockerService = require('@plagard/backend/src/services/docker.service');
const deployService = require('@plagard/backend/src/services/deploy.service');
const { logAction } = require('@plagard/backend/src/services/audit.service');

async function deployProcessor(job) {
  const startedAt = Date.now();
  const {
    deployId,
    image,
    ports = [],
    env = {},
    user = null,
    ip = null,
    replaceExisting = false,
  } = job.data;

  const currentDeploy = await deployService.findDeployById(deployId);
  const containerName = currentDeploy?.containerName || job.data.containerName || job.data.name;
  const tenantId = currentDeploy?.tenantId || user?.tenant_id || null;

  logger.info('Processing deploy job', {
    deployId,
    tenantId,
    jobId: job.id,
    containerName,
    image,
    attempt: job.attemptsMade + 1,
  });

  await deployService.markDeployRunning(deployId);
  await logAction({
    tenantId,
    userId: user?.id ?? null,
    role: user?.role ?? null,
    action: 'deploy_started',
    resource: String(deployId),
    container: containerName,
    ipAddress: ip,
    payload: {
      deployId,
      tenantId,
      containerName,
      image,
    },
    status: 'success',
    timestamp: new Date().toISOString(),
  });

  try {
    const container = await dockerService.runContainer({
      name: containerName,
      image,
      ports,
      env,
      containerId: currentDeploy?.containerId || null,
      user,
      ip,
      replaceExisting,
    });

    const logs = await dockerIntegration.getContainerLogs(container.fullId, {
      tail: 50,
      timestamps: true,
    }).catch(() => []);

    const logText = Array.isArray(logs)
      ? logs.map((entry) => `[${entry.stream}] ${entry.text}`).join('\n')
      : null;

    const updatedDeploy = await deployService.markDeploySuccess(deployId, {
      containerId: container.fullId,
      logs: logText,
    });

    await logAction({
      tenantId,
      userId: user?.id ?? null,
      role: user?.role ?? null,
      action: 'deploy_success',
      resource: String(deployId),
      container: containerName,
      ipAddress: ip,
      payload: {
        deployId,
        tenantId,
        containerId: container.fullId,
        durationMs: Date.now() - startedAt,
      },
      status: 'success',
      timestamp: new Date().toISOString(),
    });

    return {
      deployId,
      status: updatedDeploy.status,
      containerId: container.fullId,
    };
  } catch (err) {
    const recoveredContainer = await dockerService.findManagedContainer(
      currentDeploy?.containerId || currentDeploy?.containerName || containerName,
      { user, tenantScope: { tenantId } }
    ).catch(() => null);

    if (recoveredContainer?.state?.running) {
      const recoveredLogs = await dockerIntegration.getContainerLogs(recoveredContainer.fullId, {
        tail: 50,
        timestamps: true,
      }).catch(() => []);

      const recoveredLogText = Array.isArray(recoveredLogs)
        ? recoveredLogs.map((entry) => `[${entry.stream}] ${entry.text}`).join('\n')
        : null;

      const recoveredDeploy = await deployService.markDeploySuccess(deployId, {
        containerId: recoveredContainer.fullId,
        logs: recoveredLogText,
      });

      await logAction({
        tenantId,
        userId: user?.id ?? null,
        role: user?.role ?? null,
        action: 'deploy_success',
        resource: String(deployId),
        container: containerName,
        ipAddress: ip,
        payload: {
          deployId,
          tenantId,
          containerId: recoveredContainer.fullId,
          recoveredFromError: err.code || err.message,
        },
        status: 'success',
        timestamp: new Date().toISOString(),
      });

      logger.warn('Deploy recovered after transient Docker error', {
        deployId,
        tenantId,
        containerName,
        recoveredFrom: err.code || err.message,
        containerId: recoveredContainer.fullId,
        duration: Date.now() - startedAt,
      });

      return {
        deployId,
        status: recoveredDeploy.status,
        containerId: recoveredContainer.fullId,
        recovered: true,
      };
    }

    const logs = await dockerIntegration.getContainerLogs(containerName, {
      tail: 50,
      timestamps: true,
    }).catch(() => []);

    const logText = Array.isArray(logs)
      ? logs.map((entry) => `[${entry.stream}] ${entry.text}`).join('\n')
      : null;

    await deployService.markDeployFailed(deployId, {
      error: err,
      logs: logText,
      stageSource: 'worker',
    });

    await logAction({
      tenantId,
      userId: user?.id ?? null,
      role: user?.role ?? null,
      action: 'deploy_failed',
      resource: String(deployId),
      container: containerName,
      ipAddress: ip,
      payload: {
        deployId,
        tenantId,
        error: err.code || err.message,
        durationMs: Date.now() - startedAt,
      },
      status: 'failure',
      timestamp: new Date().toISOString(),
    });

    logger.error('Deploy job failed', {
      deployId,
      tenantId,
      containerName,
      error: err.message,
      code: err.code,
    });

    throw err;
  }
}

module.exports = { deployProcessor };
