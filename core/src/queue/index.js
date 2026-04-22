'use strict';

const { Queue } = require('bullmq');
const { getQueueConnection } = require('./connection');
const logger = require('../logger');

const QUEUES = {
  TASKS: 'plagard_tasks',
  DEPLOY: 'plagard_deploy',
  AUDIT: 'plagard_audit',
};

const _instances = new Map();

function getQueue(name) {
  if (_instances.has(name)) return _instances.get(name);

  const q = new Queue(name, {
    connection: getQueueConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { age: 3600, count: 1000 },
      removeOnFail: { age: 86400 },
    },
  });

  q.on('error', (err) => {
    logger.error(`Queue "${name}" error`, { error: err.message });
  });

  _instances.set(name, q);
  logger.info(`Queue initialized: ${name}`);
  return q;
}

async function addJob(queueName, jobName, data, opts = {}) {
  const queue = getQueue(queueName);
  const job = await queue.add(jobName, data, opts);
  logger.info('Job enqueued', { queue: queueName, job: jobName, jobId: job.id });
  return job;
}

module.exports = { getQueue, addJob, QUEUES };