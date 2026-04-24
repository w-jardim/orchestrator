'use strict';

const schema = {
  // APP
  NODE_ENV: { default: 'development', validate: (v) => ['development', 'staging', 'production'].includes(v) },
  PORT: { default: 3000, validate: (v) => /^\d+$/.test(v) && v >= 1024 && v <= 65535 },
  LOG_LEVEL: { default: 'info', validate: (v) => ['debug', 'info', 'warn', 'error'].includes(v) },

  // JWT
  JWT_ACCESS_SECRET: { required: true, validate: (v) => v.length >= 32 },
  JWT_ACCESS_EXPIRES: { default: '15m' },

  // DATABASE
  DB_HOST: { default: 'localhost' },
  DB_PORT: { default: 3306, validate: (v) => /^\d+$/.test(v) },
  DB_USER: { required: true },
  DB_PASS: { required: true },
  DB_NAME: { default: 'plagard_orchestrator' },

  // REDIS
  REDIS_HOST: { default: 'localhost' },
  REDIS_PORT: { default: 6379, validate: (v) => /^\d+$/.test(v) },
  REDIS_PASS: { default: '' },

  // SECURITY
  ALLOWED_ORIGINS: { default: 'http://localhost:3000' },

  // TENANT
  DEFAULT_TENANT_NAME: { default: 'Default Tenant' },
  DEFAULT_TENANT_SLUG: { default: 'default', validate: (v) => /^[a-z0-9-]+$/.test(v) },
  DEFAULT_TENANT_PLAN: { default: 'FREE', validate: (v) => ['FREE', 'PRO', 'ENTERPRISE'].includes(v) },

  // DOCKER
  DOCKER_TIMEOUT_MS: { default: 5000, validate: (v) => /^\d+$/.test(v) },
  DOCKER_BUILD_TIMEOUT_MS: { default: 120000, validate: (v) => /^\d+$/.test(v) },
  DOCKER_RUN_TIMEOUT_MS: { default: 30000, validate: (v) => /^\d+$/.test(v) },
  DOCKER_RETRY_COUNT: { default: 2, validate: (v) => /^\d+$/.test(v) && v >= 0 },
  DOCKER_RETRY_DELAY_MS: { default: 1000, validate: (v) => /^\d+$/.test(v) },
  DOCKER_ALLOWED_CONTAINERS: { default: 'all' },
  DOCKER_ALLOWED_IMAGES: { default: 'all' },

  // RATE LIMITING
  RATE_LIMIT_WINDOW_MS: { default: 60000, validate: (v) => /^\d+$/.test(v) },
  RATE_LIMIT_MAX: { default: 100, validate: (v) => /^\d+$/.test(v) },
  DOCKER_RATE_LIMIT_WINDOW_MS: { default: 60000, validate: (v) => /^\d+$/.test(v) },
  DOCKER_RATE_LIMIT_MAX: { default: 50, validate: (v) => /^\d+$/.test(v) },

  // DEPLOYMENT
  DEPLOY_FAILED_RETENTION_HOURS: { default: 168, validate: (v) => /^\d+$/.test(v) },
  DEPLOY_MAX_ENV_VARS: { default: 50, validate: (v) => /^\d+$/.test(v) },

  // WORKER
  WORKER_HEARTBEAT_KEY: { default: 'worker:heartbeat' },
  WORKER_HEARTBEAT_TTL_MS: { default: 30000, validate: (v) => /^\d+$/.test(v) },
};

function loadEnv() {
  const config = {};
  const errors = [];

  Object.entries(schema).forEach(([key, rules]) => {
    const value = process.env[key];

    if (!value && rules.required) {
      errors.push(`Required env var missing: ${key}`);
      return;
    }

    const finalValue = value !== undefined ? value : rules.default;

    if (finalValue !== undefined && rules.validate) {
      if (!rules.validate(String(finalValue))) {
        errors.push(`Invalid value for ${key}: ${finalValue}`);
        return;
      }
    }

    config[key] = finalValue;
  });

  if (errors.length > 0) {
    console.error('❌ Environment validation failed:');
    errors.forEach((err) => console.error(`  - ${err}`));
    process.exit(1);
  }

  config.isDev = config.NODE_ENV === 'development';
  config.isProd = config.NODE_ENV === 'production';
  config.isStaging = config.NODE_ENV === 'staging';

  return Object.freeze(config);
}

module.exports = loadEnv();
