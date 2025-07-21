

const pool = require('../config/db');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger.util');

const checkTokenRevocation = async (token) => {
  try {
    if (!token) return true;
    
    const result = await pool.query(
      'SELECT revoked FROM jwt_tokens WHERE token = $1',
      [token]
    );
    
    if (result.rows.length === 0) {
      return true; 
    }
    
    return result.rows[0].revoked;
  } catch (error) {
    logger.error('Token revocation check failed', { error: error.message });
    return true; 
  }
};

const verifyToken = async (req, res, next) => {
  try {
    const auth = req.headers.authorization;
    
    if (!auth || !auth.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization header required' });
    }
    
    const token = auth.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Token required' });
    }
    
    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if token is revoked
    const isRevoked = await checkTokenRevocation(token);
    if (isRevoked) {
      return res.status(401).json({ error: 'Token is revoked' });
    }
    
    req.user = decoded;
    
    if (next) {
      next();
    } else {
      // If used as endpoint, return user info
      return res.json({
        valid: true,
        user: decoded
      });
    }
    
  } catch (error) {
    logger.error('Token verification failed', { error: error.message });
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    return res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = {
  checkTokenRevocation,
  verifyToken
};
