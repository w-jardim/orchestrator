'use strict';

const { validationResult } = require('express-validator');
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
    const { name, slug, plan, status } = req.body;
    const tenant = await tenantService.createTenant({ name, slug, plan, status });
    return res.status(201).json({ success: true, data: tenant });
  } catch (err) {
    return next(err);
  }
}

async function list(req, res, next) {
  try {
    const { page, limit, status } = req.query;
    const result = await tenantService.listTenants({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      status,
    });
    return res.json({ success: true, ...result });
  } catch (err) {
    return next(err);
  }
}

async function get(req, res, next) {
  try {
    const { id } = req.params;
    const tenant = await tenantService.findTenantById(Number(id));
    if (!tenant) throw new AppError('Tenant não encontrado', 404, 'TENANT_NOT_FOUND');
    return res.json({ success: true, data: tenant });
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    if (!handleValidation(req, res)) return;
    const { id } = req.params;
    const { name, slug, plan, status } = req.body;
    const tenant = await tenantService.updateTenant(Number(id), { name, slug, plan, status });
    return res.json({ success: true, data: tenant });
  } catch (err) {
    return next(err);
  }
}

async function remove(req, res, next) {
  try {
    const { id } = req.params;
    const tenant = await tenantService.deleteTenant(Number(id));
    return res.json({ success: true, data: tenant, message: 'Tenant deletado com sucesso' });
  } catch (err) {
    return next(err);
  }
}

module.exports = { create, list, get, update, remove };
