'use strict';

const { Router } = require('express');
const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const dockerRoutes = require('./docker.routes');
const dockerImagesRoutes = require('./docker-images.routes');
const deployRoutes = require('./deploy.routes');
const tenantRoutes = require('./tenant.routes');
const userRoutes = require('./user.routes');
const projetoRoutes = require('./projeto.routes');
const gitCredentialsRoutes = require('./git-credentials.routes');

const router = Router();

router.use('/', healthRoutes);
router.use('/api/v1/auth', authRoutes);
router.use('/api/v1/tenants', tenantRoutes);
router.use('/api/v1/users', userRoutes);
router.use('/api/v1/projetos', projetoRoutes);
router.use('/api/v1/docker/containers', dockerRoutes);
router.use('/api/v1/docker/images', dockerImagesRoutes);
router.use('/api/v1/git/credentials', gitCredentialsRoutes);
router.use('/api/deploy', deployRoutes);

module.exports = router;
