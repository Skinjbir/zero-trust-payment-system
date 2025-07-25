const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const logger = require('../utils/logger.util');

// Résout le chemin absolu vers public.pem
let publicKey;
try {
  const keyPath = path.resolve(__dirname, '../keys/public.pem');
  publicKey = fs.readFileSync(keyPath, 'utf8');
} catch (err) {
  logger.error('Failed to load public key', { error: err.message });
  process.exit(1); // Arrête le service si la clé est indispensable
}

// Vérifie si le token a été révoqué dans la base
const checkTokenRevocation = async (token) => {
  try {
    if (!token) return true;
    
    const result = await pool.query(
      'SELECT revoked FROM jwt_tokens WHERE token = $1',
      [token]
    );
    
    return result.rows.length === 0 || result.rows[0].revoked;
  } catch (error) {
    logger.error('Token revocation check failed', { error: error.message });
    return true; 
  }
};

// Middleware de vérification JWT + révocation
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

    // 🔐 Vérification du JWT avec clé publique
    const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] });

    // 🔒 Vérification révocation
    const isRevoked = await checkTokenRevocation(token);
    if (isRevoked) {
      return res.status(401).json({ error: 'Token is revoked' });
    }

    req.user = decoded;
    next();

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
