'use strict';

const express = require('express');
const { body, param, query } = require('express-validator');
const userController = require('../controllers/user.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const rbac = require('../middlewares/rbac');

const router = express.Router();

// Middleware: autenticar
router.use(authenticate);

// POST /api/v1/users
router.post(
  '/',
  rbac('ADMIN_MASTER', 'ADMIN'),
  body('name').trim().notEmpty().withMessage('Nome é obrigatório'),
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 8 }).withMessage('Senha deve ter pelo menos 8 caracteres'),
  body('role').optional().isIn(['ADMIN_MASTER', 'ADMIN', 'OPERATOR', 'VIEWER']),
  body('tenantId').optional().isInt({ min: 1 }).toInt(),
  userController.create,
);

// GET /api/v1/users
router.get(
  '/',
  rbac('ADMIN_MASTER', 'ADMIN'),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('role').optional().isIn(['ADMIN_MASTER', 'ADMIN', 'OPERATOR', 'VIEWER']),
  query('tenantId').optional().isInt({ min: 1 }).toInt(),
  userController.list,
);

// GET /api/v1/users/:id
router.get(
  '/:id',
  param('id').isInt({ min: 1 }).toInt(),
  userController.get,
);

// PUT /api/v1/users/:id
router.put(
  '/:id',
  param('id').isInt({ min: 1 }).toInt(),
  body('name').optional().trim().notEmpty(),
  body('email').optional().isEmail(),
  userController.update,
);

// DELETE /api/v1/users/:id
router.delete(
  '/:id',
  rbac('ADMIN_MASTER', 'ADMIN'),
  param('id').isInt({ min: 1 }).toInt(),
  userController.remove,
);

// PATCH /api/v1/users/:id/role
router.patch(
  '/:id/role',
  rbac('ADMIN_MASTER'),
  param('id').isInt({ min: 1 }).toInt(),
  body('role').isIn(['ADMIN_MASTER', 'ADMIN', 'OPERATOR', 'VIEWER']).withMessage('Role inválida'),
  userController.changeRole,
);

// PATCH /api/v1/users/:id/status
router.patch(
  '/:id/status',
  rbac('ADMIN_MASTER', 'ADMIN'),
  param('id').isInt({ min: 1 }).toInt(),
  body('active').isBoolean().withMessage('Status deve ser verdadeiro ou falso'),
  userController.changeStatus,
);

// PATCH /api/v1/users/:id/password
router.patch(
  '/:id/password',
  param('id').isInt({ min: 1 }).toInt(),
  body('password').isLength({ min: 8 }).withMessage('Senha deve ter pelo menos 8 caracteres'),
  userController.changePassword,
);

module.exports = router;
