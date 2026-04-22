'use strict';

const { Router } = require('express');
const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');

const router = Router();

router.use('/', healthRoutes);
router.use('/api/v1/auth', authRoutes);

module.exports = router;
