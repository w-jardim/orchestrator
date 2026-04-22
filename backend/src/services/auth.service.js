'use strict';

const { signAccessToken } = require('@plagard/core/src/auth/jwt');
const { findByEmail, validatePassword } = require('./user.service');
const { AppError } = require('../middlewares/error.middleware');
const logger = require('@plagard/core/src/logger');

async function login(email, password) {
  const user = await findByEmail(email.toLowerCase());
  if (!user) throw new AppError('Credenciais inválidas', 401, 'INVALID_CREDENTIALS');
  if (!user.active) throw new AppError('Conta desativada', 403, 'ACCOUNT_DISABLED');

  const valid = await validatePassword(user, password);
  if (!valid) {
    logger.warn('Failed login attempt', { email });
    throw new AppError('Credenciais inválidas', 401, 'INVALID_CREDENTIALS');
  }

  const accessToken = signAccessToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  logger.info('User authenticated', { userId: user.id, role: user.role });

  return {
    accessToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}

module.exports = { login };
