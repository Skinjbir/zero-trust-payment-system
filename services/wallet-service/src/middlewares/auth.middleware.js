const jwt = require('jsonwebtoken');
const jwksRsa = require('jwks-rsa');
const axios = require('axios');

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';

// === JWKS Client (for RS256 key lookup) ===
const client = jwksRsa({
  jwksUri: `${AUTH_SERVICE_URL}/api/auth/.well-known/jwks.json`,
  cache: true,
  rateLimit: true,
  jwksRequestsPerMinute: 5,
});


// === Key Resolver for JWT ===
function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      console.error('[JWKS ERROR]', err);
      return callback(err);
    }
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

// === Middleware to verify JWT ===
module.exports = function retrieveUserId(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(token, getKey, { algorithms: ['RS256'] }, (err, decoded) => {
    if (err) {
      console.error('[JWT VERIFY ERROR]', err.message);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    // Add user info to request for downstream handlers
    req.userId = decoded.sub;
    req.user = decoded; 
    next();
  });
};
