const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/db');
const { generateToken } = require('../utils/jwt.util');
const logger = require('../utils/logger.util');
const { findUserByEmail, createUser } = require('../models/user.model');
const { getUserRoles, assignRole } = require('../models/role.model');
const { sendNotification } = require('../utils/notification.utils');
const { validateEmail, validatePassword } = require('../validators/validators');
const axios = require('axios');

// Replace with your user-service base URL
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://user-service:3002';

function prepareProfileData(data) {
  function formatDateOfBirth(dob) {
    // Support DDMMYYYY → YYYY-MM-DD
    if (!dob || typeof dob !== 'string') return null;
    if (/^\d{8}$/.test(dob)) {
      const day = dob.substring(0, 2);
      const month = dob.substring(2, 4);
      const year = dob.substring(4, 8);
      return `${year}-${month}-${day}`;
    }
    // If already in YYYY-MM-DD format, return as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dob)) return dob;
    return null; // fallback for invalid formats
  }

  return {
    user_id: data.user_id,
    email: data.email?.toLowerCase().trim(),
    full_name: data.full_name?.trim() || '',
    phone: data.phone?.trim() || '',
    date_of_birth: formatDateOfBirth(data.date_of_birth),
    address: data.address?.trim() || '',
    avatar_url: data.avatar_url?.trim() || '',
    bio: data.bio?.trim() || ''
  };
}

// Define Headers for application/json
const headers = {
  'Content-Type': 'application/json',
};

async function sendProfileToUserService(userId, profileData) {
  console.log('🔵 Sending profile to user-service:');
  console.log('User ID:', userId);
  console.log('Profile Data:', profileData);
  console.log('User Service URL:', USER_SERVICE_URL);
  try {
    const response = await axios.post(
      `${USER_SERVICE_URL}/api/user/createProfile`,
      { ...profileData, user_id: userId },
      { headers }
    );

    console.log('✅ User-service response:', response.data);
    return response.data;
  } catch (err) {
    console.error('❌ Failed to send profile to user-service:', err.message);
    throw new Error(`User service error: ${err.response?.data?.error || err.message}`);
  }
}

const loginAttempts = new Map();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000;

const isLockedOut = (email) => {
  const attempts = loginAttempts.get(email);
  if (!attempts) return false;

  if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
    if (Date.now() - attempts.lastAttempt < LOCKOUT_TIME) {
      return true;
    } else {
      // Reset after lockout period
      loginAttempts.delete(email);
      return false;
    }
  }
  return false;
};

const recordFailedAttempt = (email) => {
  const attempts = loginAttempts.get(email) || { count: 0, lastAttempt: 0 };
  attempts.count++;
  attempts.lastAttempt = Date.now();
  loginAttempts.set(email, attempts);
};

const clearFailedAttempts = (email) => {
  loginAttempts.delete(email);
};

exports.registerClient = async (req, res) => {
  req.body.role = 'user';
  return exports.register(req, res);
};

exports.registerAdmin = async (req, res) => {
  if (!req.body.role) {
    req.body.role = 'admin';
  }
  return exports.register(req, res);
};

exports.register = async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      email,
      password,
      role = 'user',
      phone = '',
      full_name = '',
      date_of_birth = null,
      address = '',
      avatar_url = '',
      bio = ''
    } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (!validateEmail(email)) {
      return res
        .status(400)
        .json({ error: 'Please provide a valid email address' });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({
        error:
          'Password must be at least 8 characters long and contain both letters and numbers'
      });
    }

    const sanitizedEmail = email.toLowerCase().trim();

    // Check for existing user
    const existing = await findUserByEmail(sanitizedEmail);
    if (existing) {
      return res
        .status(409)
        .json({ error: 'An account with this email already exists' });
    }

    const tokenUser = req.user;
    const privilegedRoles = ['admin', 'user_admin', 'finance_admin', 'audit_admin'];

    // Authorization check for privileged roles
    if (privilegedRoles.includes(role)) {
      const isAdmin =
        tokenUser &&
        Array.isArray(tokenUser.roles) &&
        tokenUser.roles.includes('admin');
      if (!isAdmin) {
        return res.status(403).json({
          error: `Only administrators can assign the role '${role}'`
        });
      }
    }

    await client.query('BEGIN');

    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 12);

    // ✅ Create user and assign role in auth DB
    await createUser(userId, sanitizedEmail, hashedPassword, client);
    await assignRole(userId, role, client);

    // ✅ Prepare and send profile to user-service
    const profileData = prepareProfileData({
      user_id: userId,
      email,
      full_name,
      phone,
      date_of_birth,
      address,
      avatar_url,
      bio
    });

    console.log('🔵 Profile Information:', profileData);
    await sendProfileToUserService(userId, profileData);

    await client.query('COMMIT');

    // Send notification for user registration
    await sendNotification({
      type: 'USER_REGISTERED',
      user_id: userId,
      email: sanitizedEmail,
      full_name: profileData.full_name,
      role,
      timestamp: new Date().toISOString(),
      message:'YOU ARE REGISTRERD'
    });

    console.log(`✅ Registered user ${sanitizedEmail} + profile`);
    return res.status(201).json({
      user_id: userId,
      message: `User registered successfully as ${role}`,
      email: sanitizedEmail
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[REGISTER ERROR]', error.message);
    logger.error('[REGISTER ERROR]', {
      error: error.message,
      stack: error.stack,
      email: req.body?.email
    });

    return res.status(500).json({
      error: 'Registration failed. Please try again later.',
      details: error.message.includes('User service error') ? error.message : undefined
    });
  } finally {
    client.release();
  }
};

// 🔐 User Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      logger.warn('Login attempt with missing credentials');
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }

    const sanitizedEmail = email.toLowerCase().trim();

    // Check rate limiting
    if (isLockedOut(sanitizedEmail)) {
      logger.warn(`Login attempt blocked due to rate limiting: ${sanitizedEmail}`);
      return res.status(429).json({
        error: 'Too many failed login attempts. Please try again in 15 minutes.'
      });
    }

    const user = await findUserByEmail(sanitizedEmail);
    if (!user) {
      recordFailedAttempt(sanitizedEmail);
      logger.warn(`Login attempt with non-existent email: ${sanitizedEmail}`);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      recordFailedAttempt(sanitizedEmail);
      logger.warn(`Login failed - invalid password for: ${sanitizedEmail}`);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Clear failed attempts on successful login
    clearFailedAttempts(sanitizedEmail);

    const roles = await getUserRoles(user.id);
    const token = generateToken(user, roles);
    const tokenId = uuidv4();
    const issuedAt = new Date();
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

    // Store token in database
    await pool.query(
      'INSERT INTO jwt_tokens (id, user_id, token, issued_at, expires_at) VALUES ($1, $2, $3, $4, $5)',
      [tokenId, user.id, token, issuedAt, expiresAt]
    );

    logger.info(`✅ Successful login: ${sanitizedEmail}`, {
      userId: user.id,
      email: sanitizedEmail,
      roles: roles,
      tokenId
    });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        roles: roles
      }
    });
  } catch (error) {
    logger.error('[LOGIN ERROR] Login process failed', {
      error: error.message,
      stack: error.stack,
      email: req.body?.email
    });
    res.status(500).json({ error: 'Login failed. Please try again later.' });
  }
};

// 🚪 Logout (token revocation)
exports.logout = async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      logger.warn('Logout attempt without proper Authorization header');
      return res.status(401).json({ error: 'Authorization header is required' });
    }

    const token = auth.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token is required' });
    }

    const result = await pool.query(
      'UPDATE jwt_tokens SET revoked = TRUE, revoked_at = NOW() WHERE token = $1 AND revoked = FALSE RETURNING id, user_id',
      [token]
    );

    if (result.rowCount === 0) {
      logger.warn('Logout attempt with invalid or already revoked token');
      return res.status(404).json({ error: 'Invalid token or already logged out' });
    }

    logger.info('✅ User logged out successfully', {
      tokenId: result.rows[0].id,
      userId: result.rows[0].user_id
    });

    res.json({ message: 'Successfully logged out' });
  } catch (error) {
    logger.error('[LOGOUT ERROR] Logout process failed', {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: 'Logout failed. Please try again later.' });
  }
};

// 🔄 Token Verification
exports.stillLoggedIn = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    logger.info(`Token verification successful for: ${req.user.email}`, {
      userId: req.user.id,
      email: req.user.email
    });

    res.json({
      message: 'Authentication valid',
      user: {
        id: req.user.id,
        email: req.user.email,
        roles: req.user.roles
      }
    });
  } catch (error) {
    logger.error('[TOKEN VERIFICATION ERROR]', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });
    res.status(500).json({ error: 'Token verification failed' });
  }
};

// 🔁 Reset Password (requires authentication)
exports.resetPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.sub;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (!validatePassword(newPassword)) {
      return res.status(400).json({
        error: 'New password must be at least 8 characters long and contain both letters and numbers'
      });
    }

    const user = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const validCurrentPassword = await bcrypt.compare(currentPassword, user.rows[0].password_hash);
    if (!validCurrentPassword) {
      logger.warn(`Password reset failed - invalid current password for user: ${userId}`);
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Check if new password is different from current
    const samePassword = await bcrypt.compare(newPassword, user.rows[0].password_hash);
    if (samePassword) {
      return res.status(400).json({ error: 'New password must be different from current password' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hashedNewPassword, userId]);

    // Revoke all existing tokens for security
    await pool.query(
      'UPDATE jwt_tokens SET revoked = TRUE, revoked_at = NOW() WHERE user_id = $1 AND revoked = FALSE',
      [userId]
    );

    // Send notification for password reset
    await sendNotification({
      type: 'PASSWORD_RESET',
      user_id: userId,
      email: req.user.email,
      timestamp: new Date().toISOString()
    });

    logger.info(`🔑 Password reset successfully for user: ${userId}`, {
      userId: userId,
      email: req.user.email
    });

    res.json({
      message: 'Password updated successfully. Please log in again with your new password.'
    });
  } catch (error) {
    logger.error('[RESET PASSWORD ERROR]', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });
    res.status(500).json({ error: 'Password reset failed. Please try again later.' });
  }
};

// 📩 Forgot Password (generates secure reset token)
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req?.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }

    const sanitizedEmail = email.toLowerCase().trim();
    const user = await findUserByEmail(sanitizedEmail);

    // Always return success to prevent email enumeration
    const successMessage = `If an account with that email exists, we have sent password reset instructions.`;

    if (!user) {
      logger.info(`Forgot password request for non-existent email: ${sanitizedEmail}`);
      return res.json({ message: successMessage });
    }

    // Generate secure reset token
    const resetToken = uuidv4();
    const resetTokenHash = await bcrypt.hash(resetToken, 12);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store reset token
    await pool.query(
      'INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)',
      [uuidv4(), user.id, resetTokenHash, expiresAt]
    );

    // In production, send actual email with reset link
    const resetLink = `https://your-app.com/reset-password?token=${resetToken}&email=${encodeURIComponent(sanitizedEmail)}`;

    // Send notification for password reset request
    await sendNotification({
      type: 'PASSWORD_RESET_REQUEST',
      user_id: user.id,
      email: sanitizedEmail,
      reset_link: resetLink,
      timestamp: new Date().toISOString()
    });

    logger.info(`Password reset token generated for: ${sanitizedEmail}`, {
      userId: user.id,
      email: sanitizedEmail,
      resetLink: resetLink // Remove this in production
    });

    // TODO: Integrate with email service (SendGrid, SES, etc.)
    // await sendPasswordResetEmail(sanitizedEmail, resetLink);

    res.json({ message: successMessage });
  } catch (error) {
    logger.error('[FORGOT PASSWORD ERROR]', {
      error: error.message,
      stack: error.stack,
      email: req.body?.email
    });
    res.status(500).json({ error: 'Password reset request failed. Please try again later.' });
  }
};

// 🔑 Complete Password Reset (using token from forgot password)
exports.completePasswordReset = async (req, res) => {
  try {
    const { token, email, newPassword } = req.body;

    if (!token || !email || !newPassword) {
      return res.status(400).json({ error: 'Token, email, and new password are required' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }

    if (!validatePassword(newPassword)) {
      return res.status(400).json({
        error: 'New password must be at least 8 characters long and contain both letters and numbers'
      });
    }

    const sanitizedEmail = email.toLowerCase().trim();

    // Find valid reset token
    const tokenResult = await pool.query(`
      SELECT prt.id, prt.user_id, prt.token_hash, prt.expires_at, u.email
      FROM password_reset_tokens prt
      JOIN users u ON prt.user_id = u.id
      WHERE u.email = $1 
        AND prt.used = FALSE 
        AND prt.expires_at > NOW()
      ORDER BY prt.created_at DESC
      LIMIT 1
    `, [sanitizedEmail]);

    if (tokenResult.rows.length === 0) {
      logger.warn(`Invalid or expired password reset token for: ${sanitizedEmail}`);
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const resetTokenData = tokenResult.rows[0];

    // Verify token
    const validToken = await bcrypt.compare(token, resetTokenData.token_hash);
    if (!validToken) {
      logger.warn(`Invalid password reset token for: ${sanitizedEmail}`);
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Update password and mark token as used
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update password
      await client.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [hashedPassword, resetTokenData.user_id]
      );

      // Mark reset token as used
      await client.query(
        'UPDATE password_reset_tokens SET used = TRUE WHERE id = $1',
        [resetTokenData.id]
      );

      // Revoke all existing JWT tokens for security
      await client.query(
        'UPDATE jwt_tokens SET revoked = TRUE WHERE user_id = $1 AND revoked = FALSE',
        [resetTokenData.user_id]
      );

      await client.query('COMMIT');

      // Send notification for completed password reset
      await sendNotification({
        type: 'PASSWORD_RESET_COMPLETED',
        user_id: resetTokenData.user_id,
        email: sanitizedEmail,
        timestamp: new Date().toISOString()
      });

      logger.info(`🔑 Password reset completed for: ${sanitizedEmail}`, {
        userId: resetTokenData.user_id,
        email: sanitizedEmail
      });

      res.json({ message: 'Password reset successfully. Please log in with your new password.' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('[COMPLETE PASSWORD RESET ERROR]', {
      error: error.message,
      stack: error.stack,
      email: req.body?.email
    });
    res.status(500).json({ error: 'Password reset failed. Please try again later.' });
  }
};
