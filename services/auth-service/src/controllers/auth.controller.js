const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/db');
const { generateToken } = require('../utils/jwt.util');
const { findUserByEmail, createUser } = require('../models/user.model');
const { getUserRoles, assignDefaultRole } = require('../models/role.model');
const logger = require('../utils/logger.util');

exports.register = async (req, res) => {
  const {
    email,
    password,
    full_name,
    phone,
    date_of_birth,
    address,
    avatar_url,
    bio
  } = req.body;

  if (!email || !password) {
    logger.warn('Register attempt with missing credentials');
    return res.status(400).json({ error: 'Email and password required' });
  }

  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    logger.warn(`Registration failed — user already exists: ${email}`);
    return res.status(409).json({ error: 'User already exists' });
  }

  const id = uuidv4();
  const hashed = await bcrypt.hash(password, 12);

  await createUser(
    id,
    email,
    hashed,
    full_name,
    phone,
    date_of_birth,
    address,
    avatar_url,
    bio
  );

  await assignDefaultRole(id);

  logger.info(`New user registered: ${email}`);
  res.status(201).json({ 
    user_id: id,
    message: 'User registered successfully ✅' });
};
exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    logger.warn('Login attempt with missing credentials');
    return res.status(400).json({ error: 'Email and password required' });
  }

  const user = await findUserByEmail(email);
  if (!user) {
    logger.warn(`Login failed — user not found: ${email}`);
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    logger.warn(`Login failed — invalid password for: ${email}`);
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const roles = await getUserRoles(user.id);
  const token = generateToken(user, roles);

  await pool.query(
    'INSERT INTO jwt_tokens (id, user_id, token, issued_at, expires_at) VALUES ($1, $2, $3, $4, $5)',
    [uuidv4(), user.id, token, new Date(), new Date(Date.now() + 2 * 3600 * 1000)]
  );

  logger.info(`User logged in: ${email}`);
  res.json({ message: 'Login successfuly', token });
};

exports.logout = async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      logger.warn('Logout attempt with missing Authorization header');
      return res.status(401).json({ error: 'Missing Authorization header' });
    }

    const token = auth.split(' ')[1];

    const result = await pool.query(
      'UPDATE jwt_tokens SET revoked = TRUE WHERE token = $1 RETURNING *',
      [token]
    );

    if (result.rowCount === 0) {
      logger.warn('Logout failed — token not found or already revoked');
      return res.status(404).json({ error: 'Token not found or already revoked' });
    }

    logger.info('User logged out successfully');
    res.json({ message: 'Successfully logged out 🚪' });
  } catch (err) {
    logger.error('[LOGOUT ERROR]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.stillLoggedIn = async (req, res) => {
  try {
    logger.info(`Token still valid for user: ${req.user.email}`);
    res.json({
      message: 'You are still logged in',
      user: req.user
    });
  } catch (err) {
    logger.error('[STILL LOGGED IN ERROR]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.resetPassword = async (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) {
    logger.warn('Reset password request missing fields');
    return res.status(400).json({ error: 'Email and new password required' });
  }

  const user = await findUserByEmail(email);
  if (!user) {
    logger.warn(`Reset password failed — user not found: ${email}`);
    return res.status(404).json({ error: 'User not found' });
  }

  const hashed = await bcrypt.hash(newPassword, 12);
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashed, user.id]);

  logger.info(`Password reset for user: ${email}`);
  res.json({ message: 'Password reset successfully' });
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    logger.warn('Forgot password request missing email');
    return res.status(400).json({ error: 'Email is required' });
  }

  const user = await findUserByEmail(email);
  if (!user) {
    logger.warn(`Forgot password failed — user not found: ${email}`);
    return res.status(404).json({ error: 'User not found' });
  }

  const resetLink = `https://your-app.com/reset-password?email=${encodeURIComponent(email)}`;
  logger.info(`[FORGOT PASSWORD] Reset link sent to ${email}: ${resetLink}`);

  res.json({ message: 'Reset link sent to your email' });
};
