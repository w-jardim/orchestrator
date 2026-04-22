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

function normalizeDeployPayload(data = {}) {
  return {
    deployId: Number(data.deployId),
    name: String(data.name || '').trim(),
    containerName: data.containerName ? String(data.containerName).trim() : null,
    image: String(data.image || '').trim(),
    ports: Array.isArray(data.ports) ? data.ports : [],
    env: data.env && typeof data.env === 'object' && !Array.isArray(data.env) ? data.env : {},
    user: data.user || null,
    ip: data.ip ? String(data.ip) : null,
    replaceExisting: data.replaceExisting === true,
  };
}

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

async function enqueueDeploy(data, opts = {}) {
  const payload = normalizeDeployPayload(data);

  if (!payload.deployId || !payload.name || !payload.image) {
    throw new Error('Invalid deploy payload');
  }

  return addJob(QUEUES.DEPLOY, 'deploy.run', payload, {
    jobId: `deploy_${payload.deployId}`,
    ...opts,
  });
}

async function upsertRecurringJob(queueName, jobName, data, repeat = {}, opts = {}) {
  const queue = getQueue(queueName);
  const job = await queue.add(jobName, data, {
    jobId: opts.jobId || jobName,
    repeat,
    ...opts,
  });

  logger.info('Recurring job ensured', {
    queue: queueName,
    job: jobName,
    repeat,
  });

  return job;
}

module.exports = { getQueue, addJob, enqueueDeploy, upsertRecurringJob, QUEUES };
