'use strict';

const ROLES = {
  ADMIN_MASTER: 'ADMIN_MASTER',
  ADMIN: 'ADMIN',
  OPERATOR: 'OPERATOR',
  VIEWER: 'VIEWER',
};

const ROLE_HIERARCHY = {
  [ROLES.ADMIN_MASTER]: 4,
  [ROLES.ADMIN]: 3,
  [ROLES.OPERATOR]: 2,
  [ROLES.VIEWER]: 1,
};

function hasMinimumRole(userRole, requiredRole) {
  const userLevel = ROLE_HIERARCHY[userRole] ?? 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] ?? 99;
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

module.exports = { ROLES, hasMinimumRole, requireRole, can };
