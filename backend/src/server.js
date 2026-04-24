'use strict';

require('dotenv').config();
const config = require('./config/environment');

const app = require('./app');
const logger = require('./config/plagard-core-shim').logger;
const { checkDatabaseConnection } = require('./config/database');
const { checkRedisConnection } = require('./config/redis');

async function bootstrap() {
  try {
    logger.info('Starting Plagard Orchestrator backend...');
    logger.info('Environment loaded', {
      environment: config.NODE_ENV,
      port: config.PORT,
    });

    await checkDatabaseConnection();
    // seed admin user after DB connection
    const seedAdmin = require('./bootstrap/seedAdmin');
    await seedAdmin();
    await checkRedisConnection();

    const server = app.listen(config.PORT, () => {
      logger.info(`Backend running on port ${config.PORT}`, {
        environment: config.NODE_ENV,
        port: config.PORT,
      });
    });

    function shutdown(signal) {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10_000);
    }

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('uncaughtException', (err) => {
      logger.error('Uncaught exception', { error: err.message, stack: err.stack });
      process.exit(1);
    });

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled rejection', { reason: String(reason) });
      process.exit(1);
    });
  } catch (err) {
    logger.error('Failed to start server', { error: err.message, stack: err.stack });
    process.exit(1);
  }
}

bootstrap();
