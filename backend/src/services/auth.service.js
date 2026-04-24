'use strict';

const { signAccessToken } = require('../config/plagard-core-shim').auth.jwt;
const { findByEmail, validatePassword } = require('./user.service');
const { AppError } = require('../middlewares/error.middleware');
const logger = require('../config/plagard-core-shim').logger;

async function login(email, password) {
  const user = await findByEmail(email.toLowerCase());
  if (!user) throw new AppError('Credenciais invalidas', 401, 'INVALID_CREDENTIALS');
  if (!user.active) throw new AppError('Conta desativada', 403, 'ACCOUNT_DISABLED');

  const valid = await validatePassword(user, password);
  if (!valid) {
    logger.warn('Failed login attempt', { email });
    throw new AppError('Credenciais invalidas', 401, 'INVALID_CREDENTIALS');
  }

  const accessToken = signAccessToken({
    id: user.id,
    email: user.email,
    role: user.role,
    tenant_id: user.tenant_id ?? null,
  });

  logger.info('User authenticated', {
    userId: user.id,
    role: user.role,
    tenantId: user.tenant_id ?? null,
  });

  return {
    accessToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      tenantId: user.tenant_id ?? null,
    },
  };
}

module.exports = { login };
