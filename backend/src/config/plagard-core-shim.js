'use strict';

const jwt = require('jsonwebtoken');

const ROLES = {
  ADMIN_MASTER: 'ADMIN_MASTER',
  ADMIN: 'ADMIN',
  OPERATOR: 'OPERATOR',
  VIEWER: 'VIEWER',
};

const ROLE_HIERARCHY = {
  ADMIN_MASTER: 0,
  ADMIN: 1,
  OPERATOR: 2,
  VIEWER: 3,
};

function signAccessToken(payload) {
  const secret = process.env.JWT_ACCESS_SECRET;
  const expiresIn = process.env.JWT_ACCESS_EXPIRES || '15m';

  return jwt.sign(payload, secret, { expiresIn });
}

function verifyAccessToken(token) {
  const secret = process.env.JWT_ACCESS_SECRET;
  return jwt.verify(token, secret);
}

function hasMinimumRole(userRole, requiredRole) {
  const userLevel = ROLE_HIERARCHY[userRole];
  const requiredLevel = ROLE_HIERARCHY[requiredRole];

  if (userLevel === undefined || requiredLevel === undefined) {
    return false;
  }

  return userLevel <= requiredLevel;
}

module.exports = {
  logger: require('../utils/logger'),
  auth: {
    jwt: {
      signAccessToken,
      verifyAccessToken,
    },
  },
  policies: {
    ROLES,
    hasMinimumRole,
  },
  queue: {
    QUEUES: {
      DEPLOY: 'deploy',
    },
    getQueue: () => null,
    enqueueDeploy: () => Promise.resolve(),
  },
};
