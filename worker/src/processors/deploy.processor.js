'use strict';

const logger = require('@plagard/core/src/logger');
const dockerIntegration = require('@plagard/integrations/docker');
const dockerService = require('@plagard/backend/src/services/docker.service');
const deployService = require('@plagard/backend/src/services/deploy.service');
const { logAction } = require('@plagard/backend/src/services/audit.service');

async function deployProcessor(job) {
  const {
    deployId,
    name,
    image,
    ports = [],
    env = {},
    user = null,
    ip = null,
    replaceExisting = false,
  } = job.data;

  logger.info('Processing deploy job', {
    deployId,
    jobId: job.id,
    name,
    image,
    attempt: job.attemptsMade + 1,
  });

  const currentDeploy = await deployService.findDeployById(deployId);

  await deployService.markDeployRunning(deployId);
  await logAction({
    userId: user?.id ?? null,
    role: user?.role ?? null,
    action: 'deploy_started',
    resource: String(deployId),
    container: name,
    ipAddress: ip,
    payload: { deployId, name, image },
    status: 'success',
    timestamp: new Date().toISOString(),
  });

  try {
    const container = await dockerService.runContainer({
      name,
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
      userId: user?.id ?? null,
      role: user?.role ?? null,
      action: 'deploy_success',
      resource: String(deployId),
      container: name,
      ipAddress: ip,
      payload: {
        deployId,
        containerId: container.fullId,
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
      currentDeploy?.containerId || name
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
        userId: user?.id ?? null,
        role: user?.role ?? null,
        action: 'deploy_success',
        resource: String(deployId),
        container: name,
        ipAddress: ip,
        payload: {
          deployId,
          containerId: recoveredContainer.fullId,
          recoveredFromError: err.code || err.message,
        },
        status: 'success',
        timestamp: new Date().toISOString(),
      });

      logger.warn('Deploy recovered after transient Docker error', {
        deployId,
        name,
        recoveredFrom: err.code || err.message,
        containerId: recoveredContainer.fullId,
      });

      return {
        deployId,
        status: recoveredDeploy.status,
        containerId: recoveredContainer.fullId,
        recovered: true,
      };
    }

    const logs = await dockerIntegration.getContainerLogs(name, {
      tail: 50,
      timestamps: true,
    }).catch(() => []);

    const logText = Array.isArray(logs)
      ? logs.map((entry) => `[${entry.stream}] ${entry.text}`).join('\n')
      : null;

    await deployService.markDeployFailed(deployId, {
      error: err.code || err.message,
      logs: logText,
    });

    await logAction({
      userId: user?.id ?? null,
      role: user?.role ?? null,
      action: 'deploy_failed',
      resource: String(deployId),
      container: name,
      ipAddress: ip,
      payload: {
        deployId,
        error: err.code || err.message,
      },
      status: 'failure',
      timestamp: new Date().toISOString(),
    });

    logger.error('Deploy job failed', {
      deployId,
      name,
      error: err.message,
      code: err.code,
    });

    throw err;
  }
}

module.exports = { deployProcessor };
