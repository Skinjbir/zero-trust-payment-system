const express = require('express');
const router = express.Router();
const { logEvent, getAllLogs } = require('../controllers/audit.controller');

router.post('/', logEvent); // Add a new audit log
router.get('/', getAllLogs); // List logs (can filter later)

module.exports = router;
