'use strict';

const { Router } = require('express');
const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const dockerRoutes = require('./docker.routes');
const deployRoutes = require('./deploy.routes');
const tenantRoutes = require('./tenant.routes');

const router = Router();

router.use('/', healthRoutes);
router.use('/api/v1/auth', authRoutes);
router.use('/api/v1/tenants', tenantRoutes);
router.use('/api/docker/containers', dockerRoutes);
router.use('/api/deploy', deployRoutes);

module.exports = router;
