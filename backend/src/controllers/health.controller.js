'use strict';

const { checkDatabaseConnection } = require('../config/database');
const { getRedisClient } = require('../config/redis');
const logger = require('@plagard/core/src/logger');

async function saude(req, res) {
  const checks = { database: 'ok', redis: 'ok' };
  let httpStatus = 200;

  try {
    await checkDatabaseConnection();
  } catch (err) {
    logger.error('Health check: database failed', { error: err.message });
    checks.database = 'error';
    httpStatus = 503;
  }

  try {
    const redis = getRedisClient();
    await redis.ping();
  } catch (err) {
    logger.error('Health check: redis failed', { error: err.message });
    checks.redis = 'error';
    httpStatus = 503;
  }

  return res.status(httpStatus).json({
    status: httpStatus === 200 ? 'ok' : 'degraded',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    checks,
  });
}

module.exports = { saude };
