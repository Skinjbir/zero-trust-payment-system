const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');
const logger = require('../utils/logger.util');

const PUBLIC_KEY = fs.readFileSync(path.join(__dirname, '../keys/public.pem'), 'utf8');

module.exports = async (req, res, next) => {
  try {
    const auth = req.headers.authorization;

    if (!auth || !auth.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or malformed Authorization header' });
    }

    const token = auth.split(' ')[1];

    // 🔍 Verify signature & decode token
    const decoded = jwt.verify(token, PUBLIC_KEY, { algorithms: ['RS256'] });

    // 🔐 Check revocation status
    const result = await pool.query(
      'SELECT revoked FROM jwt_tokens WHERE token = $1',
      [token]
    );


    
    if (result.rowCount === 0) {
      logger.warn('Access denied — token is not registered');
      return res.status(403).json({ error: 'Unrecognized token' });
    }

    if (result.rows[0].revoked) {
      logger.warn('Access denied — token is revoked');
      return res.status(403).json({ error: 'Token is revoked' });
    }

    req.user = decoded;
    next();
  } catch (err) {
    logger.error('[AUTH MIDDLEWARE ERROR]', err);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};
