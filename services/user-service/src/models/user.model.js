const pool = require('../config/db');
exports.getUserByIdFromDB = async (id) => {
  const result = await pool.query(
    `SELECT 
       u.id AS user_id,
       u.email,
       p.full_name,
       p.phone,
       p.date_of_birth,
       p.address,
       p.avatar_url,
       p.bio,
       p.created_at,
       p.updated_at
     FROM users u
     JOIN profiles p ON u.id = p.user_id
     WHERE u.id = $1`,
    [id]
  );
  return result.rows[0];
};
