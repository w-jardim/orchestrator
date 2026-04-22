'use strict';

const { authorize } = require('./auth.middleware');

// thin wrapper to keep middleware namespace consistent
function requireRole(role) {
  return authorize(role);
}

module.exports = { requireRole };
