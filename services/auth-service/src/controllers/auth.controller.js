const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/db');
const { generateToken } = require('../utils/jwt.util');
const logger = require('../utils/logger.util');
const { findUserByEmail, createUser } = require('../models/user.model');
const { getUserRoles, assignRole } = require('../models/role.model');

exports.registerClient = async (req, res) => {
  req.query.role = 'user'; // force role
  return exports.register(req, res);
};

exports.registerAdmin = async (req, res) => {
  return exports.register(req, res); 
};


// 🧾 User Registration (Public for 'user', admin-only for elevated roles)
exports.register = async (req, res) => {
  try {
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

    const role = req.query.role || 'user';
    const tokenUser = req.user;
    const privilegedRoles = ['admin', 'user_admin', 'finance_admin', 'audit_admin'];

    if (privilegedRoles.includes(role)) {
      const isAdmin = tokenUser && Array.isArray(tokenUser.roles) && tokenUser.roles.includes('admin');
      if (!isAdmin) {
        logger.warn(`❌ Unauthorized role assignment: '${role}' by ${tokenUser?.email || 'unauthenticated user'}`);
        return res.status(403).json({ error: `Only admins can assign the role '${role}'` });
      }
    }

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 12);

    await createUser(userId, email, hashedPassword, full_name, phone, date_of_birth, address, avatar_url, bio);
    await assignRole(userId, role);

    logger.info(`✅ Registered ${email} as '${role}'`);
    return res.status(201).json({
      user_id: userId,
      message: `User registered successfully as ${role}`
    });
  } catch (error) {
    logger.error('[REGISTER ERROR]', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// 🔐 User Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      logger.warn('Login missing credentials');
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      logger.warn(`Login failed — user not found: ${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      logger.warn(`Login failed — wrong password for: ${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const roles = await getUserRoles(user.id);
    const token = generateToken(user, roles);

    await pool.query(
      'INSERT INTO jwt_tokens (id, user_id, token, issued_at, expires_at) VALUES ($1, $2, $3, $4, $5)',
      [uuidv4(), user.id, token, new Date(), new Date(Date.now() + 2 * 60 * 60 * 1000)]
    );

    logger.info(`✅ Logged in: ${email}`);
    res.json({ message: 'Login successfuly', token });
  } catch (err) {
    logger.error('[LOGIN ERROR]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 🚪 Logout (token revocation)
exports.logout = async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      logger.warn('Logout without Authorization header');
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

    logger.info('✅ User logged out');
    res.json({ message: 'Successfully logged out 🚪' });
  } catch (err) {
    logger.error('[LOGOUT ERROR]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 🔄 Token Verification
exports.stillLoggedIn = async (req, res) => {
  try {
    logger.info(`Token valid for: ${req.user.email}`);
    res.json({
      message: 'You are still logged in',
      user: req.user
    });
  } catch (err) {
    logger.error('[STILL LOGGED IN ERROR]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 🔁 Reset Password
exports.resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      return res.status(400).json({ error: 'Email and new password required' });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashed, user.id]);

    logger.info(`🔑 Password reset for: ${email}`);
    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    logger.error('[RESET PASSWORD ERROR]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 📩 Forgot Password (fake email flow)
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const resetLink = `https://your-app.com/reset-password?email=${encodeURIComponent(email)}`;
    logger.info(`[FORGOT PASSWORD] Reset link sent to ${email}: ${resetLink}`);

    res.json({ message: 'Reset link sent to your email' });
  } catch (err) {
    logger.error('[FORGOT PASSWORD ERROR]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
