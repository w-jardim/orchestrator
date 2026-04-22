'use strict';

const winston = require('winston');

const { combine, timestamp, json, errors, colorize, printf } = winston.format;

const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'HH:mm:ss' }),
  printf(({ level, message, timestamp: ts, service, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${ts} [${service}] ${level}: ${message}${metaStr}`;
  })
);

const prodFormat = combine(
  errors({ stack: true }),
  timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
  json()
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
  defaultMeta: { service: 'plagard-orchestrator' },
  transports: [
    new winston.transports.Console(),
  ],
  exitOnError: false,
});

// Audit helper: structured audit log
logger.audit = function audit(message, meta = {}) {
  this.info(message, Object.assign({ audit: true }, meta));
};

module.exports = logger;
