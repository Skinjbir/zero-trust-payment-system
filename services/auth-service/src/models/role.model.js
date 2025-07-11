const pool = require('../config/db');

// 🔍 Get all role names for a user
async function getUserRoles(userId) {
  const res = await pool.query(
    `SELECT r.name
     FROM user_roles ur
     JOIN roles r ON r.id = ur.role_id
     WHERE ur.user_id = $1`,
    [userId]
  );

  return res.rows.map(row => row.name);
}

// 🎯 Assign 'user' role by default
async function assignDefaultRole(userId) {
  await assignRole(userId, 'user');
}

// 🎯 Assign a specific role by name
async function assignRole(userId, roleName) {
  const res = await pool.query(
    'SELECT id FROM roles WHERE name = $1',
    [roleName]
  );

  if (res.rowCount === 0) {
    throw new Error(`Role '${roleName}' not found`);
  }

  const roleId = res.rows[0].id;

  // Prevent duplicate insert
  await pool.query(
    `INSERT INTO user_roles (user_id, role_id)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [userId, roleId]
  );
}

module.exports = {
  getUserRoles,
  assignDefaultRole,
  assignRole
};
