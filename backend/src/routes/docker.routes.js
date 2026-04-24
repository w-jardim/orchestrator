'use strict';

const { Router } = require('express');
const { param, query, body } = require('express-validator');
const { ROLES } = require('../config/plagard-core-shim').policies;
const controller = require('../controllers/docker.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/rbac');
const tenantContext = require('../middlewares/tenant-context.middleware');
const createDockerRateLimiter = require('../middlewares/rateLimit');
const validate = require('../middlewares/validate');

const router = Router();

router.use(authenticate);
router.use(tenantContext);
router.use(createDockerRateLimiter());

const validateId = [
  param('id')
    .trim()
    .matches(/^(?:[a-f0-9]{12}|[a-f0-9]{64}|[a-z0-9][a-z0-9_.-]{0,190})$/)
    .withMessage('ID de container invalido: use ID Docker hex ou nome seguro'),
];

const validateLogsQuery = [
  query('tail').optional().isInt({ min: 1, max: 200 }).withMessage('tail deve ser inteiro entre 1 e 200'),
  query('timestamps').optional().isBoolean().withMessage('timestamps deve ser true ou false'),
];

const validateTimeout = [
  body('timeout').optional().isInt({ min: 1, max: 60 }).withMessage('timeout deve ser inteiro entre 1 e 60 segundos'),
];

const validateListQuery = [
  query('all').optional().isBoolean().withMessage('all deve ser true ou false'),
  query('tenantId').optional().isInt({ min: 1 }).withMessage('tenantId invalido'),
];

const validateRemoveBody = [
  body('force').optional().isBoolean().withMessage('force deve ser booleano'),
  body('removeVolumes').optional().isBoolean().withMessage('removeVolumes deve ser booleano'),
];

router.get('/', requireRole(ROLES.VIEWER), validateListQuery, validate, controller.list);
router.get('/:id', requireRole(ROLES.VIEWER), validateId, validate, controller.inspect);
router.get('/:id/logs', requireRole(ROLES.OPERATOR), [...validateId, ...validateLogsQuery], validate, controller.logs);
router.post('/:id/start', requireRole(ROLES.ADMIN), [...validateId, ...validateTimeout], validate, controller.start);
router.post('/:id/stop', requireRole(ROLES.ADMIN), [...validateId, ...validateTimeout], validate, controller.stop);
router.post('/:id/restart', requireRole(ROLES.ADMIN), [...validateId, ...validateTimeout], validate, controller.restart);
router.delete('/:id', requireRole(ROLES.ADMIN), [...validateId, ...validateRemoveBody], validate, controller.remove);

module.exports = router;
