const express = require('express');
const { register, login, logout, stillLoggedIn, forgotPassword, resetPassword} = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', authMiddleware, logout);

router.post('/me', authMiddleware, stillLoggedIn);

router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

router.post('/still-logged-in', authMiddleware, stillLoggedIn);

module.exports = router;
