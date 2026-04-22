'use strict';

const { Redis } = require('ioredis');
const logger = require('@plagard/core/src/logger');

let _client = null;

function getRedisClient() {
  if (_client) return _client;

  _client = new Redis({
    host: process.env.REDIS_HOST || 'redis',
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASS || undefined,
    retryStrategy: (times) => Math.min(times * 100, 5000),
    lazyConnect: true,
  });

  _client.on('error', (err) => {
    logger.error('Redis client error', { error: err.message });
  });

  _client.on('connect', () => {
    logger.info('Redis client connected');
  });

  return _client;
}

async function checkRedisConnection() {
  const client = getRedisClient();
  await client.connect();
  await client.ping();
  logger.info('Redis connection established');
}

module.exports = { getRedisClient, checkRedisConnection };
