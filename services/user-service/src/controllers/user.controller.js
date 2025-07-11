require('dotenv').config();
const db = require('../config/db');
const { getUserByIdFromDB } = require('../models/user.model');

// 🔐 Get your own profile (based on JWT subject)
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.sub;
    const user = await getUserByIdFromDB(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    console.error('Error getting profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 🔎 Get user by ID (public/admin usage)
exports.getUserById = async (req, res) => {
  try {
    const user = await getUserByIdFromDB(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 🧾 Register user + profile (via /register)
exports.createProfile = async (req, res) => {
  try {
    const { user_id, email, full_name, phone, date_of_birth, address, avatar_url, bio } = req.body;

    if (!user_id || !email) {
      return res.status(400).json({ error: 'user_id and email are required' });
    }

    // check for duplicates
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    // insert into users
    await db.query(
      'INSERT INTO users (id, email) VALUES ($1, $2)',
      [user_id, email]
    );

    // insert profile data
    const result = await db.query(
      `INSERT INTO profiles (
         user_id, full_name, phone, date_of_birth, address, avatar_url, bio
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [user_id, full_name, phone, date_of_birth, address, avatar_url, bio]
    );

    res.status(201).json({ user_id, profile: result.rows[0] });
  } catch (error) {
    console.error('Error creating profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 👥 Get all users (admin-only route)
exports.getAllUsers = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM users');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching all users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ✏️ Update own profile
exports.updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.sub;
    const { full_name, phone, date_of_birth, address, avatar_url, bio } = req.body;

    const result = await db.query(
      `UPDATE profiles
       SET full_name = $1, phone = $2, date_of_birth = $3, address = $4, avatar_url = $5, bio = $6, updated_at = NOW()
       WHERE user_id = $7
       RETURNING *`,
      [full_name, phone, date_of_birth, address, avatar_url, bio, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
