const pool = require('../config/db');

async function getUserRoles(userId) {
  const res = await pool.query(
    `SELECT r.name FROM user_roles ur
     JOIN roles r ON r.id = ur.role_id
     WHERE ur.user_id = $1`, [userId]
  );
  return res.rows.map(r => r.name);
}

async function assignDefaultRole(userId) {
  const res = await pool.query('SELECT id FROM roles WHERE name = $1', ['user']);
  if (res.rowCount > 0) {
    const roleId = res.rows[0].id;
    await pool.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [userId, roleId]);
  }
}

module.exports = {
  getUserRoles,
  assignDefaultRole
};
