const express = require('express');
const { register, login, logout, stillLoggedIn, forgotPassword, resetPassword} = require('../controllers/auth.controller');
const { verifyToken } = require('../controllers/token.controller')
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', authMiddleware, logout);

router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

router.post('/verify', verifyToken);
router.get('/.well-known/jwks.json', (req, res) => {
  res.json({
    keys: [
      {
        kty: "RSA",
        kid: "auth-key-1",
        use: "sig",
        alg: "RS256",
        n: "<base64-modulus>",
        e: "AQAB"
      }
    ]
  });
});


router.get('/health', (req, res) => {
    res.status(200).json({ message: 'Auth service is healthy' });
});
module.exports = router;
