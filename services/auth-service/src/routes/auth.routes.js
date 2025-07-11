const express = require('express');
const {
  register,
  registerClient,
  registerAdmin,
  login,
  logout,
  stillLoggedIn,
  forgotPassword,
  resetPassword
} = require('../controllers/auth.controller');

const { verifyToken } = require('../controllers/token.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const jwks = require('../utils/jwks.util');

const router = express.Router();

// 🧾 Registration
router.post('/register-client', registerClient);             // public
router.post('/register-admin', authMiddleware, registerAdmin); // admin-only

// 🔐 Auth flow
router.post('/login', login);
router.post('/logout', authMiddleware, logout);
router.get('/still-logged-in', authMiddleware, stillLoggedIn);

// 🔁 Password management
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// 🔍 Token verification
router.post('/verify', verifyToken);

// 🔑 JWKS endpoint
router.get('/.well-known/jwks.json', (req, res) => {
  res.json(jwks);
});

// 🫀 Health check
router.get('/health', (req, res) => {
  res.status(200).json({ message: 'Auth service is healthy' });
});

module.exports = router;
