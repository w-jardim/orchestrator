'use strict';

const knex = require('knex');
const logger = require('../config/plagard-core-shim').logger;

let _db = null;

function getDatabase() {
  if (_db) return _db;

  _db = knex({
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST || 'mysql',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'orchestrator',
      password: process.env.DB_PASS || '',
      database: process.env.DB_NAME || 'plagard_orchestrator',
      charset: 'utf8mb4',
      timezone: 'UTC',
    },
    pool: {
      min: 2,
      max: 10,
      acquireTimeoutMillis: 30000,
      createTimeoutMillis: 30000,
      idleTimeoutMillis: 600000,
    },
    asyncStackTraces: process.env.NODE_ENV !== 'production',
  });

  _db.on('query', (queryData) => {
    if (process.env.NODE_ENV === 'development') {
      logger.debug('SQL Query', { sql: queryData.sql });
    }
  });

  return _db;
}

async function checkDatabaseConnection() {
  const db = getDatabase();
  await db.raw('SELECT 1');
  logger.info('Database connection established');
}

module.exports = { getDatabase, checkDatabaseConnection };
