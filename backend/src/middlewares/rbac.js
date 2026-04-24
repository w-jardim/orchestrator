'use strict';

const { authorize } = require('./auth.middleware');

function rbac(role) {
  return authorize(role);
}

module.exports = rbac;
