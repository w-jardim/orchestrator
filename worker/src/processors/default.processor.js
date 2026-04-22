'use strict';

const logger = require('@plagard/core/src/logger');

async function defaultProcessor(job) {
  logger.info('Processing job', {
    queue: job.queueName,
    jobId: job.id,
    jobName: job.name,
    attempt: job.attemptsMade + 1,
  });

  switch (job.name) {
    case 'ping':
      return handlePing(job);
    default:
      logger.warn('Unknown job name, skipping', { jobName: job.name });
      return { skipped: true };
  }
}

async function handlePing(job) {
  const { message = 'pong' } = job.data;
  logger.info('Ping job handled', { message });
  return { result: message, processedAt: new Date().toISOString() };
}

module.exports = { defaultProcessor };
