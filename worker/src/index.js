'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { Worker } = require('bullmq');
const { getQueueConnection } = require('@plagard/core/src/queue/connection');
const { QUEUES, upsertRecurringJob } = require('@plagard/core/src/queue');
const logger = require('@plagard/core/src/logger');
const { getRedisClient } = require('@plagard/backend/src/config/redis');
const { WORKER_HEARTBEAT_KEY, WORKER_HEARTBEAT_TTL_MS } = require('@plagard/backend/src/services/health.service');
logger.info('Resolved QUEUES at startup', { QUEUES });
const { defaultProcessor } = require('./processors/default.processor');
const { deployProcessor } = require('./processors/deploy.processor');

const CONCURRENCY = Number(process.env.WORKER_CONCURRENCY) || 5;
const RECONCILE_INTERVAL_MS = Number(process.env.RECONCILE_INTERVAL_MS) || 60_000;
const CLEANUP_INTERVAL_MS = Number(process.env.CLEANUP_INTERVAL_MS) || 300_000;
const HEARTBEAT_INTERVAL_MS = Number(process.env.WORKER_HEARTBEAT_INTERVAL_MS) || 5_000;
const WORKER_NAME = process.env.WORKER_NAME || 'plagard-worker';

function createWorker(queueName, processor) {
  logger.info('Creating worker', { queueName });
  const worker = new Worker(queueName, processor, {
    connection: getQueueConnection(),
    concurrency: CONCURRENCY,
    removeOnComplete: { age: 3600, count: 1000 },
    removeOnFail: { age: 86400 },
  });

  worker.on('completed', (job, result) => {
    const duration = job.finishedOn && job.processedOn ? job.finishedOn - job.processedOn : null;
    logger.operation('Job completed', {
      action: 'worker.job.completed',
      status: 'success',
      duration,
      queue: queueName,
      jobId: job.id,
      jobName: job.name,
      result,
    });
  });

  worker.on('failed', (job, err) => {
    const duration = job?.finishedOn && job?.processedOn ? job.finishedOn - job.processedOn : null;
    logger.error('Job failed', {
      action: 'worker.job.failed',
      status: 'failure',
      duration,
      queue: queueName,
      jobId: job?.id,
      jobName: job?.name,
      error: err.message,
      attempts: job?.attemptsMade,
    });
  });

  worker.on('error', (err) => {
    logger.error('Worker error', { queue: queueName, error: err.message });
  });

  return worker;
}

async function writeHeartbeat() {
  const redis = getRedisClient();
  if (redis.status === 'wait') {
    await redis.connect();
  }

  const heartbeat = JSON.stringify({
    workerName: WORKER_NAME,
    timestamp: new Date().toISOString(),
    pid: process.pid,
    status: 'ok',
  });

  await redis.set(
    WORKER_HEARTBEAT_KEY,
    heartbeat,
    'PX',
    Math.max(WORKER_HEARTBEAT_TTL_MS, HEARTBEAT_INTERVAL_MS * 3)
  );
}

async function ensureSystemJobs() {
  await upsertRecurringJob(QUEUES.TASKS, 'system.reconcile', {}, { every: RECONCILE_INTERVAL_MS }, {
    jobId: 'system.reconcile',
    removeOnComplete: { age: 3600, count: 1000 },
    removeOnFail: { age: 86400 },
  });
  await upsertRecurringJob(QUEUES.TASKS, 'system.cleanup', {}, { every: CLEANUP_INTERVAL_MS }, {
    jobId: 'system.cleanup',
    removeOnComplete: { age: 3600, count: 1000 },
    removeOnFail: { age: 86400 },
  });
}

async function bootstrap() {
  logger.info('Starting Plagard Worker...');
  await ensureSystemJobs();
  await writeHeartbeat();
  logger.info('Worker heartbeat started', {
    workerName: WORKER_NAME,
    heartbeatKey: WORKER_HEARTBEAT_KEY,
    intervalMs: HEARTBEAT_INTERVAL_MS,
    ttlMs: WORKER_HEARTBEAT_TTL_MS,
    pid: process.pid,
  });
  const heartbeatTimer = setInterval(() => {
    writeHeartbeat().catch((err) => {
      logger.error('Failed to write worker heartbeat', { error: err.message });
    });
  }, HEARTBEAT_INTERVAL_MS);
  heartbeatTimer.unref();

  const workers = [
    createWorker(QUEUES.TASKS, defaultProcessor),
    createWorker(QUEUES.DEPLOY, deployProcessor),
  ];

  logger.info('Workers registered', {
    queues: [QUEUES.TASKS, QUEUES.DEPLOY],
    concurrency: CONCURRENCY,
  });

  async function shutdown(signal) {
    logger.info(`Received ${signal}, closing workers...`);
    clearInterval(heartbeatTimer);
    await Promise.all(workers.map((w) => w.close()));
    logger.info('All workers closed');
    process.exit(0);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception in worker', { error: err.message, stack: err.stack });
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection in worker', { reason: String(reason) });
    process.exit(1);
  });
}

bootstrap();
