const express = require('express');
const router = express.Router();
const { logEvent } = require('../controllers/audit.controller');

router.post('/', logEvent); // Add a new audit log

module.exports = router;
