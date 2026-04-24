'use strict';

const { validationResult } = require('express-validator');
const userService = require('../services/user.service');
const tenantService = require('../services/tenant.service');
const { AppError } = require('../middlewares/error.middleware');

function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ success: false, errors: errors.array() });
    return false;
  }
  return true;
}

async function create(req, res, next) {
  try {
    if (!handleValidation(req, res)) return;

    const { name, email, password, role, tenantId } = req.body;
    const userRole = req.user.role;
    const userTenantId = req.user.tenant_id;

    // Validar autorização: ADMIN_MASTER pode criar qualquer um, ADMIN só do mesmo tenant
    if (userRole === 'ADMIN' && Number(tenantId) !== userTenantId) {
      throw new AppError('Não autorizado', 403, 'FORBIDDEN');
    }

    // Se não for ADMIN_MASTER, deve haver tenantId válido
    const finalTenantId = tenantId || (userRole !== 'ADMIN_MASTER' ? userTenantId : null);
    if (!finalTenantId && role !== 'ADMIN_MASTER') {
      throw new AppError('Tenant obrigatório', 422, 'TENANT_REQUIRED');
    }

    const user = await userService.createUser({
      name,
      email,
      password,
      role: role || 'VIEWER',
      tenantId: finalTenantId,
    });

    return res.status(201).json({ success: true, data: user });
  } catch (err) {
    return next(err);
  }
}

async function list(req, res, next) {
  try {
    const { page, limit, role } = req.query;
    const userRole = req.user.role;
    const tenantId = req.user.tenant_id;

    // ADMIN_MASTER pode listar todos ou filtrar por tenant; outros usuários ficam restritos ao próprio tenant
    let searchTenantId = tenantId;
    if (userRole === 'ADMIN_MASTER') {
      searchTenantId = req.query.tenantId ? Number(req.query.tenantId) : null;
    } else if (!searchTenantId) {
      throw new AppError('Tenant obrigatório', 422, 'TENANT_REQUIRED');
    }

    const result = await userService.listUsers(searchTenantId, {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      role,
    });

    return res.json({ success: true, ...result });
  } catch (err) {
    return next(err);
  }
}

async function get(req, res, next) {
  try {
    const { id } = req.params;
    const userRole = req.user.role;
    const userTenantId = req.user.tenant_id;

    const user = await userService.findById(Number(id));
    if (!user) throw new AppError('Usuário não encontrado', 404, 'USER_NOT_FOUND');

    // Validar acesso: ADMIN_MASTER acessa qualquer um, outros só do mesmo tenant
    if (userRole !== 'ADMIN_MASTER' && user.tenant_id !== userTenantId) {
      throw new AppError('Não autorizado', 403, 'FORBIDDEN');
    }

    return res.json({ success: true, data: user });
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    if (!handleValidation(req, res)) return;

    const { id } = req.params;
    const { name, email } = req.body;
    const userRole = req.user.role;
    const userTenantId = req.user.tenant_id;

    const targetUser = await userService.findById(Number(id));
    if (!targetUser) throw new AppError('Usuário não encontrado', 404, 'USER_NOT_FOUND');

    // Validar acesso
    if (userRole !== 'ADMIN_MASTER' && targetUser.tenant_id !== userTenantId) {
      throw new AppError('Não autorizado', 403, 'FORBIDDEN');
    }

    const user = await userService.updateUser(Number(id), { name, email });
    return res.json({ success: true, data: user });
  } catch (err) {
    return next(err);
  }
}

async function remove(req, res, next) {
  try {
    const { id } = req.params;
    const userRole = req.user.role;
    const userTenantId = req.user.tenant_id;

    const targetUser = await userService.findById(Number(id));
    if (!targetUser) throw new AppError('Usuário não encontrado', 404, 'USER_NOT_FOUND');

    // Validar acesso
    if (userRole !== 'ADMIN_MASTER' && targetUser.tenant_id !== userTenantId) {
      throw new AppError('Não autorizado', 403, 'FORBIDDEN');
    }

    const user = await userService.deleteUser(Number(id));
    return res.json({ success: true, data: user, message: 'Usuário deletado com sucesso' });
  } catch (err) {
    return next(err);
  }
}

async function changeRole(req, res, next) {
  try {
    if (!handleValidation(req, res)) return;

    const { id } = req.params;
    const { role } = req.body;
    const userRole = req.user.role;

    // Apenas ADMIN_MASTER pode alterar roles
    if (userRole !== 'ADMIN_MASTER') {
      throw new AppError('Não autorizado', 403, 'FORBIDDEN');
    }

    const user = await userService.changeRole(Number(id), role);
    return res.json({ success: true, data: user });
  } catch (err) {
    return next(err);
  }
}

async function changeStatus(req, res, next) {
  try {
    if (!handleValidation(req, res)) return;

    const { id } = req.params;
    const { active } = req.body;
    const userRole = req.user.role;
    const userTenantId = req.user.tenant_id;

    const targetUser = await userService.findById(Number(id));
    if (!targetUser) throw new AppError('Usuário não encontrado', 404, 'USER_NOT_FOUND');

    // ADMIN pode alterar status do próprio tenant, ADMIN_MASTER de qualquer um
    if (userRole === 'ADMIN' && targetUser.tenant_id !== userTenantId) {
      throw new AppError('Não autorizado', 403, 'FORBIDDEN');
    }

    const user = await userService.changeStatus(Number(id), active);
    return res.json({ success: true, data: user });
  } catch (err) {
    return next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    if (!handleValidation(req, res)) return;

    const { id } = req.params;
    const { password } = req.body;

    // Apenas ADMIN_MASTER pode alterar senha de outros, usuário pode alterar a sua própria
    if (req.user.id !== Number(id) && req.user.role !== 'ADMIN_MASTER') {
      throw new AppError('Não autorizado', 403, 'FORBIDDEN');
    }

    const user = await userService.changePassword(Number(id), password);
    return res.json({ success: true, data: user });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  create,
  list,
  get,
  update,
  remove,
  changeRole,
  changeStatus,
  changePassword,
};
