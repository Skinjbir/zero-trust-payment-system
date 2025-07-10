const jwt = require('jsonwebtoken');
const pool = require('../config/db');

module.exports = async (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }

  const token = auth.split(' ')[1];

  try {
    // Verify signature
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if token was revoked
    const result = await pool.query(
      'SELECT revoked FROM jwt_tokens WHERE token = $1',
      [token]
    );

    if (result.rowCount === 0 || result.rows[0].revoked) {
      return res.status(403).json({ error: 'Token is revoked or invalid' });
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};
