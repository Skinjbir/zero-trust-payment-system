const db = require('../config/db');

async function checkTokenRevocation(token) {
  const result = await db.query(
    'SELECT revoked FROM jwt_tokens WHERE token = $1',
    [token]
  );

  if (result.rowCount === 0) return true; 
  return result.rows[0].revoked === true;
}

module.exports = {
  checkTokenRevocation,
};
