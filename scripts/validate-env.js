#!/usr/bin/env node
'use strict';

require('dotenv').config();

const schema = {
  NODE_ENV: { default: 'development', validate: (v) => ['development', 'staging', 'production'].includes(v) },
  PORT: { default: 3000, validate: (v) => /^\d+$/.test(v) && v >= 1024 && v <= 65535 },
  LOG_LEVEL: { default: 'info', validate: (v) => ['debug', 'info', 'warn', 'error'].includes(v) },
  JWT_ACCESS_SECRET: { required: true, validate: (v) => v.length >= 32 },
  JWT_ACCESS_EXPIRES: { default: '15m' },
  DB_HOST: { default: 'localhost' },
  DB_PORT: { default: 3306, validate: (v) => /^\d+$/.test(v) },
  DB_USER: { required: true },
  DB_PASS: { required: true },
  DB_NAME: { default: 'plagard_orchestrator' },
  REDIS_HOST: { default: 'localhost' },
  REDIS_PORT: { default: 6379, validate: (v) => /^\d+$/.test(v) },
  REDIS_PASS: { default: '' },
  ALLOWED_ORIGINS: { default: 'http://localhost:3000' },
  DEFAULT_TENANT_NAME: { default: 'Default Tenant' },
  DEFAULT_TENANT_SLUG: { default: 'default', validate: (v) => /^[a-z0-9-]+$/.test(v) },
  DEFAULT_TENANT_PLAN: { default: 'FREE', validate: (v) => ['FREE', 'PRO', 'ENTERPRISE'].includes(v) },
  DOCKER_TIMEOUT_MS: { default: 5000, validate: (v) => /^\d+$/.test(v) },
  DOCKER_BUILD_TIMEOUT_MS: { default: 120000, validate: (v) => /^\d+$/.test(v) },
  DOCKER_RUN_TIMEOUT_MS: { default: 30000, validate: (v) => /^\d+$/.test(v) },
  DOCKER_RETRY_COUNT: { default: 2, validate: (v) => /^\d+$/.test(v) && v >= 0 },
  DOCKER_RETRY_DELAY_MS: { default: 1000, validate: (v) => /^\d+$/.test(v) },
  DOCKER_ALLOWED_CONTAINERS: { default: 'all' },
  DOCKER_ALLOWED_IMAGES: { default: 'all' },
  RATE_LIMIT_WINDOW_MS: { default: 60000, validate: (v) => /^\d+$/.test(v) },
  RATE_LIMIT_MAX: { default: 100, validate: (v) => /^\d+$/.test(v) },
  DOCKER_RATE_LIMIT_WINDOW_MS: { default: 60000, validate: (v) => /^\d+$/.test(v) },
  DOCKER_RATE_LIMIT_MAX: { default: 50, validate: (v) => /^\d+$/.test(v) },
  DEPLOY_FAILED_RETENTION_HOURS: { default: 168, validate: (v) => /^\d+$/.test(v) },
  DEPLOY_MAX_ENV_VARS: { default: 50, validate: (v) => /^\d+$/.test(v) },
  WORKER_HEARTBEAT_KEY: { default: 'worker:heartbeat' },
  WORKER_HEARTBEAT_TTL_MS: { default: 30000, validate: (v) => /^\d+$/.test(v) },
};

function validateEnv() {
  console.log('\n📋 Validating environment variables...\n');

  const errors = [];
  const warnings = [];
  const valid = [];

  Object.entries(schema).forEach(([key, rules]) => {
    const value = process.env[key];

    if (!value && rules.required) {
      errors.push(`❌ REQUIRED: ${key} is missing`);
      return;
    }

    const finalValue = value !== undefined ? value : rules.default;

    if (finalValue !== undefined && rules.validate) {
      if (!rules.validate(String(finalValue))) {
        errors.push(`❌ INVALID: ${key} = "${finalValue}"`);
        return;
      }
    }

    const source = value !== undefined ? '(from .env)' : '(default)';
    if (rules.required) {
      valid.push(`✅ ${key} = ${finalValue} ${source}`);
    } else if (value !== undefined) {
      valid.push(`✅ ${key} = ${finalValue} ${source}`);
    } else {
      warnings.push(`⚠️  ${key} = ${finalValue} (default - consider overriding)`);
    }
  });

  // Security warnings
  if (process.env.JWT_ACCESS_SECRET === 'change-me-access-secret-min-32-chars' ||
      process.env.JWT_ACCESS_SECRET === 'your-secret-min-32-chars-change-in-prod') {
    warnings.push('⚠️  JWT_ACCESS_SECRET is using a default value - CHANGE THIS IN PRODUCTION');
  }

  if (process.env.NODE_ENV === 'production' && process.env.LOG_LEVEL === 'debug') {
    warnings.push('⚠️  LOG_LEVEL is "debug" in production - consider setting to "info"');
  }

  // Display results
  if (valid.length > 0) {
    console.log('Valid variables:');
    valid.forEach((msg) => console.log(`  ${msg}`));
    console.log();
  }

  if (warnings.length > 0) {
    console.log('Warnings:');
    warnings.forEach((msg) => console.log(`  ${msg}`));
    console.log();
  }

  if (errors.length > 0) {
    console.log('Errors:');
    errors.forEach((msg) => console.log(`  ${msg}`));
    console.log(`\n❌ Validation failed with ${errors.length} error(s)\n`);
    process.exit(1);
  }

  console.log('✅ All environment variables are valid!\n');
  process.exit(0);
}

validateEnv();
