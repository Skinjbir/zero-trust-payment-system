

// admin controller
const db = require('../db');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger.util');
const { findUserByEmail, createUser } = require('../models/user.model');
const { getUserRoles, assignDefaultRole } = require('../models/role.model');
exports.createAdmin = async (req, res) => {
  const { email, password, fullName, phone } = req.body;

  if (!email || !password) {
    logger.warn('Admin creation attempt with missing credentials');
    return res.status(400).json({ error: 'Email and password required' });
  }

  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    logger.warn(`Admin creation failed — user already exists: ${email}`);
    return res.status(409).json({ error: 'User already exists' });
  }

  const id = uuidv4();
  const hashed = await bcrypt.hash(password, 12);
  await createUser(id, email, hashed, fullName, phone);
  await assignDefaultRole(id);

  logger.info(`New admin created: ${email}`);
  res.status(201).json({ message: 'Admin created successfully ✅' });
};


exports.getMetrics = async (req, res) => {
    try {
        const totalUsers = await db.query('SELECT COUNT(*) FROM users');
        const totalAdmins = await db.query('SELECT COUNT(*) FROM users WHERE id IN (SELECT user_id FROM user_roles WHERE role_id = (SELECT id FROM roles WHERE name = $1))', ['admin']);
        const totalRoles = await db.query('SELECT COUNT(*) FROM roles');
    
        res.status(200).json({
        totalUsers: parseInt(totalUsers.rows[0].count, 10),
        totalAdmins: parseInt(totalAdmins.rows[0].count, 10),
        totalRoles: parseInt(totalRoles.rows[0].count, 10)
        });
    } catch (error) {
        logger.error('Error fetching metrics:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
    }