const jwt = require('jsonwebtoken');
const jwksRsa = require('jwks-rsa');

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';

const client = jwksRsa({
  jwksUri: `${AUTH_SERVICE_URL}/api/auth/.well-known/jwks.json`,
  cache: true,
  rateLimit: true,
  jwksRequestsPerMinute: 5,
});

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

module.exports = function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed token' });
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(token, getKey, { algorithms: ['RS256'] }, (err, decoded) => {
    if (err) {
      console.error('[JWT ERROR]', err);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = decoded; // sub, email, role, etc.
    next();
  });
};
