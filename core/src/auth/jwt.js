'use strict';

const jwt = require('jsonwebtoken');

function _getSecret() {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error('JWT_ACCESS_SECRET is not defined');
  return secret;
}

function signAccessToken(payload) {
  return jwt.sign(payload, _getSecret(), {
    expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
    algorithm: 'HS256',
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, _getSecret(), { algorithms: ['HS256'] });
}

module.exports = { signAccessToken, verifyAccessToken };
