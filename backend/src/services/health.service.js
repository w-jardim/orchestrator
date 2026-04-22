'use strict';

const dockerIntegration = require('@plagard/integrations/docker');
const { getQueue, QUEUES } = require('@plagard/core/src/queue');
const { getQueueConnection } = require('@plagard/core/src/queue/connection');
const { checkDatabaseConnection } = require('../config/database');
const { getRedisClient } = require('../config/redis');

const WORKER_HEARTBEAT_KEY = process.env.WORKER_HEARTBEAT_KEY || 'plagard:worker:heartbeat';
const WORKER_HEARTBEAT_TTL_MS = Number(process.env.WORKER_HEARTBEAT_TTL_MS) || 15_000;

function parseWorkerHeartbeat(raw) {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.timestamp) {
      return parsed;
    }
  } catch (_err) {
    // Backward compatibility with the old numeric-only heartbeat format.
  }

  const legacyTimestamp = Number(raw);
  if (!Number.isNaN(legacyTimestamp) && legacyTimestamp > 0) {
    return {
      workerName: 'plagard-worker',
      timestamp: new Date(legacyTimestamp).toISOString(),
      pid: null,
      status: 'ok',
      legacy: true,
    };
  }

  return null;
}

async function getQueueHealth() {
  const deployQueue = getQueue(QUEUES.DEPLOY);
  const tasksQueue = getQueue(QUEUES.TASKS);
  const [deployCounts, tasksCounts] = await Promise.all([
    deployQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
    tasksQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
  ]);

  return {
    status: 'ok',
    details: {
      deploy: deployCounts,
      tasks: tasksCounts,
    },
  };
}

async function getWorkerHealth(redis) {
  const raw = await redis.get(WORKER_HEARTBEAT_KEY);
  const heartbeat = parseWorkerHeartbeat(raw);

  if (!heartbeat) {
    return { status: 'error', details: { heartbeat: null } };
  }

  const heartbeatTimestamp = new Date(heartbeat.timestamp).getTime();
  const ageMs = Date.now() - heartbeatTimestamp;

  return {
    status: ageMs <= WORKER_HEARTBEAT_TTL_MS ? 'ok' : 'error',
    details: {
      heartbeat: heartbeat.timestamp,
      workerName: heartbeat.workerName || 'plagard-worker',
      pid: heartbeat.pid ?? null,
      reportedStatus: heartbeat.status || 'unknown',
      ageMs,
      ttlMs: WORKER_HEARTBEAT_TTL_MS,
    },
  };
}

async function getFullHealth() {
  const checks = {};
  let degraded = false;

  try {
    await checkDatabaseConnection();
    checks.database = { status: 'ok' };
  } catch (err) {
    checks.database = { status: 'error', error: err.message };
    degraded = true;
  }

  const redis = getRedisClient();
  try {
    if (redis.status === 'wait') {
      await redis.connect();
    }
    await redis.ping();
    checks.redis = { status: 'ok' };
  } catch (err) {
    checks.redis = { status: 'error', error: err.message };
    degraded = true;
  }

  try {
    await dockerIntegration.listContainers({ all: false });
    checks.docker = { status: 'ok' };
  } catch (err) {
    checks.docker = { status: 'error', error: err.message };
    degraded = true;
  }

  try {
    const queueConnection = getQueueConnection();
    if (queueConnection.status === 'wait') {
      await queueConnection.connect();
    }
    await queueConnection.ping();
    checks.queues = await getQueueHealth();
  } catch (err) {
    checks.queues = { status: 'error', error: err.message };
    degraded = true;
  }

  try {
    checks.worker = await getWorkerHealth(redis);
    if (checks.worker.status !== 'ok') degraded = true;
  } catch (err) {
    checks.worker = { status: 'error', error: err.message };
    degraded = true;
  }

  return {
    status: degraded ? 'degraded' : 'ok',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    checks,
  };
}

module.exports = {
  WORKER_HEARTBEAT_KEY,
  WORKER_HEARTBEAT_TTL_MS,
  getFullHealth,
};
