const pool = require('../config/db');
const axios = require('axios');

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://user-service:3002';

async function findUserByEmail(email) {
  const res = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return res.rows[0];
}
async function createUser(id, email, hashedPassword, fullName, phone, dateOfBirth, address, avatarUrl, bio) {
  // 1️⃣ Create user in auth DB
  await pool.query(
    `INSERT INTO users (id, email, password_hash, created_at, updated_at)
     VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [id, email, hashedPassword]
  );

  // 2️⃣ Send full profile to user-service
  try {
    await axios.post(`${USER_SERVICE_URL}/api/user/register`, {
      user_id: id,
      email,
      full_name: fullName,
      phone,
      date_of_birth: dateOfBirth,
      address,
      avatar_url: avatarUrl,
      bio
    });

    console.log('[auth → user-service] ✅ Profile created.');
  } catch (error) {
    console.error('[auth → user-service] ❌ Profile creation failed:', error.message);
  }
}

module.exports = {
  findUserByEmail,
  createUser
};
