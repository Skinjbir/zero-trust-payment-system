const express = require('express');
const { getProfile, getUserById } = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/profile', authMiddleware, getProfile);
router.get('/id/:id', authMiddleware, getUserById);

module.exports = router;
