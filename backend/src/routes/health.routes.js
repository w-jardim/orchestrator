'use strict';

const { Router } = require('express');
const { saude, healthFull } = require('../controllers/health.controller');

const router = Router();

router.get('/saude', saude);
router.get('/full', healthFull);

module.exports = router;
