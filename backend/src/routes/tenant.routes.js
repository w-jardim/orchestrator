'use strict';

const express = require('express');
const { body, param, query } = require('express-validator');
const tenantController = require('../controllers/tenant.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { rbac } = require('../middlewares/rbac');

const router = express.Router();

// Middleware: autenticar e validar RBAC ADMIN_MASTER apenas
router.use(authenticate);
router.use(rbac('ADMIN_MASTER'));

// POST /api/v1/tenants
router.post(
  '/',
  body('name').trim().notEmpty().withMessage('Nome é obrigatório'),
  body('slug').trim().notEmpty().withMessage('Slug é obrigatório'),
  body('plan').optional().isIn(['FREE', 'PRO', 'ENTERPRISE']),
  body('status').optional().isIn(['active', 'inactive', 'suspended']),
  tenantController.create,
);

// GET /api/v1/tenants
router.get(
  '/',
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('status').optional().isIn(['active', 'inactive', 'suspended']),
  tenantController.list,
);

// GET /api/v1/tenants/:id
router.get(
  '/:id',
  param('id').isInt({ min: 1 }).toInt(),
  tenantController.get,
);

// PUT /api/v1/tenants/:id
router.put(
  '/:id',
  param('id').isInt({ min: 1 }).toInt(),
  body('name').optional().trim().notEmpty(),
  body('slug').optional().trim().notEmpty(),
  body('plan').optional().isIn(['FREE', 'PRO', 'ENTERPRISE']),
  body('status').optional().isIn(['active', 'inactive', 'suspended']),
  tenantController.update,
);

// DELETE /api/v1/tenants/:id
router.delete(
  '/:id',
  param('id').isInt({ min: 1 }).toInt(),
  tenantController.remove,
);

module.exports = router;
