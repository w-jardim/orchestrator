'use strict';

const { Router } = require('express');
const { body, param, query } = require('express-validator');
const { ROLES } = require('../config/plagard-core-shim').policies;
const controller = require('../controllers/deploy.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/rbac');
const tenantContext = require('../middlewares/tenant-context.middleware');
const validate = require('../middlewares/validate');

const router = Router();

router.use(authenticate);
router.use(tenantContext);

router.post(
  '/',
  requireRole(ROLES.ADMIN),
  [
    body('name')
      .isString()
      .trim()
      .matches(/^[a-z0-9][a-z0-9_.-]{2,62}$/)
      .withMessage('name invalido'),
    body('image')
      .isString()
      .trim()
      .matches(/^(?:(?:[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?(?::[0-9]+)?\/)*[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?)(?::[\w][\w.-]{0,127})?$/i)
      .withMessage('image invalida'),
    body('ports').optional().isArray().withMessage('ports deve ser array'),
    body('ports.*').optional().isString().matches(/^\d{1,5}:\d{1,5}$/).withMessage('ports deve usar HOST:CONTAINER'),
    body('env').optional().isObject().withMessage('env deve ser objeto'),
    body('tenantId').optional().isInt({ min: 1 }).withMessage('tenantId invalido'),
  ],
  validate,
  controller.create
);

router.get(
  '/',
  requireRole(ROLES.VIEWER),
  [query('tenantId').optional().isInt({ min: 1 }).withMessage('tenantId invalido')],
  validate,
  controller.list
);

router.get('/:id', requireRole(ROLES.VIEWER), [param('id').isInt({ min: 1 }).withMessage('id invalido')], validate, controller.getById);
router.post('/:id/redeploy', requireRole(ROLES.ADMIN), [param('id').isInt({ min: 1 }).withMessage('id invalido')], validate, controller.redeploy);
router.post('/:id/stop', requireRole(ROLES.ADMIN), [param('id').isInt({ min: 1 }).withMessage('id invalido')], validate, controller.stop);

module.exports = router;
