const pool = require('../config/db');

// Get user and profile data by ID
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
  return result.rows[0]; // Return single user
};

// Check if a user already exists by ID or email
exports.checkUserExists = async (id, email) => {
  const result = await pool.query(
    'SELECT id FROM users WHERE id = $1 OR email = $2 LIMIT 1',
    [id, email]
  );
  return result.rows.length > 0;
};

// Insert a new user into the users table
exports.insertUser = async (userData) => {
  const { user_id, email } = userData;

  const result = await pool.query(
    `INSERT INTO users (id, email, created_at, updated_at)
     VALUES ($1, $2, NOW(), NOW())
     RETURNING id`,
    [user_id, email]
  );
  return result.rows[0].id; // Return the new user ID
};

// Insert a new profile into the profiles table
exports.insertProfile = async (profileData) => {
  const {
    user_id,
    full_name,
    phone,
    date_of_birth,
    address,
    avatar_url,
    bio
  } = profileData;

  const result = await pool.query(
    `INSERT INTO profiles 
      (user_id, full_name, phone, date_of_birth, address, avatar_url, bio, created_at, updated_at)
     VALUES 
      ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
     RETURNING *`,
    [user_id, full_name, phone, date_of_birth, address, avatar_url, bio]
  );
  return result.rows[0]; 
};
