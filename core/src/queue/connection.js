'use strict';

const { Redis } = require('ioredis');
const logger = require('../logger');

let _connection = null;

function getQueueConnection() {
  if (_connection) return _connection;

  _connection = new Redis({
    host: process.env.REDIS_HOST || 'redis',
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASS || undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
  });

  _connection.on('error', (err) => {
    logger.error('Redis connection error', { error: err.message });
  });

  _connection.on('connect', () => {
    logger.info('Redis connected (queue)');
  });

  return _connection;
}

module.exports = { getQueueConnection };
