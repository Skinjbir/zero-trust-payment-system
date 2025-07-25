const express = require('express');
const router = express.Router();
const controller = require('../controllers/notificationController');

router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.post('/send', controller.sendTest);

module.exports = router;
