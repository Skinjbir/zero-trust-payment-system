
const pool = require('../config/db');

const getUserRoles = async (userId) => {
  const result = await pool.query(`
    SELECT r.name 
    FROM roles r
    JOIN user_roles ur ON r.id = ur.role_id
    WHERE ur.user_id = $1
  `, [userId]);
  
  return result.rows.map(row => row.name);
};

const assignRole = async (userId, roleName, client = pool) => {
  // First get role ID
  const roleResult = await client.query(
    'SELECT id FROM roles WHERE name = $1',
    [roleName]
  );
  
  if (roleResult.rows.length === 0) {
    throw new Error(`Role '${roleName}' not found`);
  }
  
  const roleId = roleResult.rows[0].id;
  
  // Then assign role to user
  return await client.query(
    'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [userId, roleId]
  );
};

module.exports = {
  getUserRoles,
  assignRole
};