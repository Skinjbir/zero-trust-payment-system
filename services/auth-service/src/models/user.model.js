const pool = require('../config/db');

// 🔍 Find user by email
async function findUserByEmail(email) {
  const res = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return res.rows[0];
}

// 🆕 Create user + assign default role + simulate user-service call
async function createUser(id, email, hashedPassword, fullName = null, phone = null) {
  // 1️⃣ Insert user
  await pool.query(
    `INSERT INTO users (id, email, password_hash, created_at, updated_at)
     VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [id, email, hashedPassword]
  );


  // 4️⃣ Simulate sending profile to user-service
  console.log('[auth → user-service] Creating user profile:', {
    userId: id,
    fullName: fullName || '(not provided)',
    phone: phone || '(not provided)'
  });
}

module.exports = {
  findUserByEmail,
  createUser
};
