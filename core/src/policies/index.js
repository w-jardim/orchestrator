'use strict';

const ROLES = {
  ADMIN_MASTER: 'ADMIN_MASTER',
  ADMIN: 'ADMIN',
  OPERATOR: 'OPERATOR',
  VIEWER: 'VIEWER',
};

const ROLE_ORDER = [
  ROLES.VIEWER,
  ROLES.OPERATOR,
  ROLES.ADMIN,
  ROLES.ADMIN_MASTER,
];

const ROLE_HIERARCHY = Object.freeze(
  ROLE_ORDER.reduce((acc, role, index) => {
    acc[role] = index + 1;
    return acc;
  }, {})
);

function normalizeRole(role) {
  return typeof role === 'string' ? role.trim().toUpperCase() : '';
}

function hasMinimumRole(userRole, requiredRole) {
  const userLevel = ROLE_HIERARCHY[normalizeRole(userRole)] ?? 0;
  const requiredLevel = ROLE_HIERARCHY[normalizeRole(requiredRole)] ?? 99;
  return userLevel >= requiredLevel;
}

function requireRole(requiredRole) {
  return (user) => {
    if (!user || !user.role) return false;
    return hasMinimumRole(user.role, requiredRole);
  };
}

const can = {
  viewDashboard: requireRole(ROLES.VIEWER),
  manageContainers: requireRole(ROLES.OPERATOR),
  deployProject: requireRole(ROLES.OPERATOR),
  manageUsers: requireRole(ROLES.ADMIN),
  manageSystem: requireRole(ROLES.ADMIN_MASTER),
};

module.exports = { ROLES, ROLE_HIERARCHY, hasMinimumRole, requireRole, can };
