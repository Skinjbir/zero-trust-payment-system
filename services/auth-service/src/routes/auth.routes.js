const express = require('express');
const router = express.Router();

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

/**
 * ================================
 *           AUTH ROUTES
 * ================================
 */

// 🧾 Registration Endpoints
router.post('/register-client', registerClient);               // Public registration
router.post('/register-admin', authMiddleware, registerAdmin); // Admin-only registration

// 🔐 Authentication Flow
router.post('/login', login);
router.post('/logout', authMiddleware, logout);
router.get('/still-logged-in', authMiddleware, stillLoggedIn);

// 🔁 Password Management
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', authMiddleware, resetPassword);       // Requires authentication
router.post('/complete-password-reset', completePasswordReset);       // Uses reset token

// 🔍 Token Verification
router.post('/verify', verifyToken);

// 🔑 JSON Web Key Set Endpoint for JWT verification
router.get('/.well-known/jwks.json', (req, res) => {
  res.json(jwks);
});

// Combined token validation with revocation check
router.get('/validate', verifyToken, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

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
    console.error('[VALIDATE ERROR]', error.message);
    res.status(500).json({ error: 'Token validation failed' });
  }
});

// 🫀 Health Check Endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ message: 'Auth service is healthy' });
});

module.exports = router;
