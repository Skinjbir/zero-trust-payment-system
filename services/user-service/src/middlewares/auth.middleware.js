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

// JWT validation middleware
const validateToken = (req, res, next) => {
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

    req.user = decoded;
    console.log(req.user)
    next();
  });
};

// Input validation middleware for Joi schemas
const validateInput = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error } = schema.validate(req[property], { abortEarly: false });
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(detail => detail.message)
      });
    }
    next();
  };
};

// (Removed erroneous fragment. The correct exports are at the end of the file.)


module.exports = {
  validateToken,
  validateInput,
};