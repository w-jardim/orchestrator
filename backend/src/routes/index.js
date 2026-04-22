'use strict';

const { Router } = require('express');
const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const dockerRoutes = require('./docker.routes');

const router = Router();

router.use('/', healthRoutes);
router.use('/api/v1/auth', authRoutes);
router.use('/api/docker/containers', dockerRoutes);

module.exports = router;
