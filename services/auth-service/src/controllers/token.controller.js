const jwt = require('jsonwebtoken');
const { PUBLIC_KEY } = require('../config/jwt'); 
const logger = require('../utils/logger.util');
const pool = require('../config/db'); 
exports.verifyToken = async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      return res.status(401).json({ valid: false, error: 'Missing Authorization header' });
    }

    const token = auth.split(' ')[1];
    const decoded = jwt.verify(token, PUBLIC_KEY, { algorithms: ['RS256'] });
    
    // Check if token is revoked
    const result = await pool.query(
      'SELECT revoked FROM jwt_tokens WHERE token = $1',
      [token]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ valid: false, error: 'Token not found' });
    }

    if (result.rows[0].revoked) {
      return res.status(401).json({ valid: false, error: 'Token is revoked' });
    }

    return res.status(200).json({
      valid: true,
      user: {
        id: decoded.sub,
        email: decoded.email,
        role: decoded.role
      }
    });
  } catch (err) {
    logger.error('[VERIFY TOKEN ERROR]', err);
    return res.status(401).json({ valid: false, error: 'Invalid or expired token' });
  }
};
