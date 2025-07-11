const pool = require('../config/db');

exports.getUserByIdFromDB = async (id) => {
  const result = await pool.query('SELECT id, email, full_name FROM users WHERE id = $1', [id]);
  return result.rows[0];
};
