'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { Worker } = require('bullmq');
const { getQueueConnection } = require('@plagard/core/src/queue/connection');
const { QUEUES } = require('@plagard/core/src/queue');
const { defaultProcessor } = require('./processors/default.processor');
const logger = require('@plagard/core/src/logger');

const CONCURRENCY = Number(process.env.WORKER_CONCURRENCY) || 5;

function createWorker(queueName, processor) {
  const worker = new Worker(queueName, processor, {
    connection: getQueueConnection(),
    concurrency: CONCURRENCY,
    removeOnComplete: { age: 3600, count: 1000 },
    removeOnFail: { age: 86400 },
  });

  worker.on('completed', (job, result) => {
    logger.info('Job completed', {
      queue: queueName,
      jobId: job.id,
      jobName: job.name,
      result,
    });
  });

  worker.on('failed', (job, err) => {
    logger.error('Job failed', {
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

async function bootstrap() {
  logger.info('Starting Plagard Worker...');

  const workers = [
    createWorker(QUEUES.TASKS, defaultProcessor),
    createWorker(QUEUES.DEPLOY, defaultProcessor),
  ];

  logger.info('Workers registered', {
    queues: [QUEUES.TASKS, QUEUES.DEPLOY],
    concurrency: CONCURRENCY,
  });

  async function shutdown(signal) {
    logger.info(`Received ${signal}, closing workers...`);
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
