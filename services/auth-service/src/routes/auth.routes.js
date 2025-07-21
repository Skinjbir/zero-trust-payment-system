
const express = require('express');
const {
  register,
  registerClient,
  registerAdmin,
  login,
  logout,
  stillLoggedIn,
  forgotPassword,
  resetPassword,
  completePasswordReset
} = require('../controllers/auth.controller');

const { checkTokenRevocation, verifyToken } = require('../controllers/token.controller');
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
router.post('/reset-password', authMiddleware, resetPassword); // requires auth
router.post('/complete-password-reset', completePasswordReset); // uses token

// 🔍 Token verification
router.post('/verify', verifyToken);

// 🔑 JWKS endpoint
router.get('/.well-known/jwks.json', (req, res) => {
  res.json(jwks);
});

// Combined validate endpoint with revocation check
router.get('/validate', verifyToken, async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token is required' });
    }

    const isRevoked = await checkTokenRevocation(token);
    if (isRevoked) {
      return res.status(401).json({ error: 'Token is revoked' });
    }

    res.status(200).json({
      valid: true,
      user: {
        id: req.user.sub || req.user.id,
        email: req.user.email,
        role: req.user.role || req.user.roles?.[0] || 'user',
        roles: req.user.roles || []
      }
    });
  } catch (error) {
    logger.error('[VALIDATE ERROR]', { error: error.message });
    res.status(500).json({ error: 'Token validation failed' });
  }
});

// 🫀 Health check
router.get('/health', (req, res) => {
  res.status(200).json({ message: 'Auth service is healthy' });
});

module.exports = router;

