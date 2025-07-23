require('dotenv').config();
const db = require('../config/db');
const logger = require('../utils/logger.util'); // Added logger import
const { getUserByIdFromDB, checkUserExists, insertProfile, insertUser } = require('../models/user.model');

const ROLES = {
  USER: 'user',
  ADMIN: 'admin',              
  USER_ADMIN: 'user_admin',
  FINANCE_ADMIN: 'finance_admin',
  AUDIT_ADMIN: 'audit_admin'
};

// Role permissions mapping
const PERMISSIONS = {
  READ_ALL_USERS: [ROLES.ADMIN, ROLES.USER_ADMIN, ROLES.AUDIT_ADMIN],
  READ_USER_DETAILS: [ROLES.ADMIN, ROLES.USER_ADMIN, ROLES.AUDIT_ADMIN],
  MANAGE_USERS: [ROLES.ADMIN, ROLES.USER_ADMIN],
  AUDIT_ACCESS: [ROLES.ADMIN, ROLES.AUDIT_ADMIN]
};

const checkPermission = (requiredRoles) => {
  return (req, res, next) => {
    const userRoles = req.user?.roles || [];

    logger.info('📋 [INFO] Checking permissions', {
      userId: req.user?.sub,
      email: req.user?.email,
      userRoles,
      requiredRoles,
      timestamp: new Date().toISOString()
    });

    if (userRoles.includes(ROLES.ADMIN)) {
      logger.info('✅ [INFO] User is ADMIN, bypassing permission check', {
        userId: req.user?.sub,
        email: req.user?.email,
        timestamp: new Date().toISOString()
      });
      return next(); 
    }

    const hasPermission = userRoles.some(role => requiredRoles.includes(role));
    if (!hasPermission) {
      logger.warn('🚫 [WARN] Access denied: insufficient permissions', {
        userId: req.user?.sub,
        email: req.user?.email,
        userRoles,
        requiredRoles,
        timestamp: new Date().toISOString()
      });
      return res.status(403).json({
        error: 'Access denied',
        message: 'Insufficient permissions'
      });
    }

    logger.info('✅ [INFO] Permission granted', {
      userId: req.user?.sub,
      email: req.user?.email,
      userRoles,
      timestamp: new Date().toISOString()
    });
    next();
  };
};

// Input validation helpers
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhone = (phone) => {
  if (!phone) return true;
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
};

const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.trim().replace(/[<>]/g, '');
};

// Data filtering based on role
const filterUserData = (user, userRole, isOwnProfile = false) => {
  const baseData = {
    user_id: user.user_id || user.id,
    full_name: user.full_name,
    avatar_url: user.avatar_url,
    bio: user.bio,
    created_at: user.created_at,
    updated_at: user.updated_at
  };

  // Users can see their own full profile
  if (isOwnProfile) {
    return {
      ...baseData,
      email: user.email,
      phone: user.phone,
      date_of_birth: user.date_of_birth,
      address: user.address
    };
  }

  // Admins can see sensitive data
  if (PERMISSIONS.READ_USER_DETAILS.includes(userRole)) {
    return {
      ...baseData,
      email: user.email,
      phone: user.phone,
      date_of_birth: user.date_of_birth,
      address: user.address,
      role: user.role
    };
  }

  // Public data only
  return baseData;
};

// 🔐 Get your own profile
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user?.sub;
    const userRole = req.user?.role || ROLES.USER;
    
    if (!userId) {
      logger.warn('🚫 [WARN] Unauthorized attempt to get profile', {
        email: req.user?.email,
        timestamp: new Date().toISOString()
      });
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'User ID not found' 
      });
    }

    logger.info('📋 [INFO] Fetching user profile', {
      userId,
      userRole,
      email: req.user?.email,
      timestamp: new Date().toISOString()
    });

    const user = await getUserByIdFromDB(userId);
    
    if (!user) {
      logger.warn('🚫 [WARN] User not found', {
        userId,
        timestamp: new Date().toISOString()
      });
      return res.status(404).json({ 
        error: 'User not found'
      });
    }

    const filteredUser = filterUserData(user, userRole, true);
    
    logger.info('✅ [INFO] User profile retrieved successfully', {
      userId,
      email: user.email,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      data: filteredUser
    });
  } catch (error) {
    logger.error('❌ [ERROR] Failed to get user profile', {
      userId: req.user?.sub,
      email: req.user?.email,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ 
      error: 'Internal server error'
    });
  }
};

// 🔎 Get user by ID
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?.sub;
    const userRole = req.user?.role || ROLES.USER;
    const userRoles = req.user?.roles || [];

    logger.info('📋 [INFO] Fetching user by ID', {
      targetUserId: id,
      currentUserId,
      userRole,
      email: req.user?.email,
      timestamp: new Date().toISOString()
    });

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      logger.warn('🚫 [WARN] Invalid user ID format', {
        targetUserId: id,
        currentUserId,
        timestamp: new Date().toISOString()
      });
      return res.status(400).json({
        error: 'Invalid user ID format'
      });
    }

    const user = await getUserByIdFromDB(id);

    if (!user) {
      logger.warn('🚫 [WARN] User not found', {
        targetUserId: id,
        currentUserId,
        timestamp: new Date().toISOString()
      });
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Check permissions
    const isOwnProfile = currentUserId === id;
    const hasPermission = userRoles.some(role =>
      PERMISSIONS.READ_USER_DETAILS.includes(role)
    );

    logger.info('📋 [INFO] Checking access permissions', {
      targetUserId: id,
      currentUserId,
      isOwnProfile,
      hasPermission,
      userRoles,
      timestamp: new Date().toISOString()
    });

    if (!isOwnProfile && !hasPermission) {
      logger.warn('🚫 [WARN] Access denied to user profile', {
        targetUserId: id,
        currentUserId,
        userRoles,
        timestamp: new Date().toISOString()
      });
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    const filteredUser = filterUserData(user, userRole, isOwnProfile);

    logger.info('✅ [INFO] User profile retrieved successfully', {
      targetUserId: id,
      currentUserId,
      email: user.email,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      data: filteredUser
    });
  } catch (error) {
    logger.error('❌ [ERROR] Failed to fetch user by ID', {
      targetUserId: req.params.id,
      currentUserId: req.user?.sub,
      email: req.user?.email,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

// 🧾 Create user profile (called by auth service)
exports.createProfile = async (req, res) => {
  try {
    const { 
      user_id, 
      email, 
      full_name, 
      phone, 
      date_of_birth, 
      address, 
      avatar_url, 
      bio 
    } = req.body;

    // Validate required fields
    if (!user_id || !email) {
      logger.warn('🚫 [WARN] Missing required fields for profile creation', {
        userId: user_id,
        email,
        timestamp: new Date().toISOString()
      });
      return res.status(400).json({ 
        error: 'Missing required fields',
        message: 'user_id and email are required'
      });
    }

    // Validate email format
    if (!validateEmail(email)) {
      logger.warn('🚫 [WARN] Invalid email format for profile creation', {
        userId: user_id,
        email,
        timestamp: new Date().toISOString()
      });
      return res.status(400).json({ 
        error: 'Invalid email format'
      });
    }

    // Validate phone if provided
    if (phone && !validatePhone(phone)) {
      logger.warn('🚫 [WARN] Invalid phone format for profile creation', {
        userId: user_id,
        email,
        phone,
        timestamp: new Date().toISOString()
      });
      return res.status(400).json({ 
        error: 'Invalid phone format'
      });
    }

    // Sanitize inputs
    const sanitizedData = {
      user_id,
      email: sanitizeInput(email.toLowerCase()),
      full_name: sanitizeInput(full_name),
      phone: sanitizeInput(phone),
      date_of_birth,
      address: sanitizeInput(address),
      avatar_url: sanitizeInput(avatar_url),
      bio: sanitizeInput(bio),
    };

    logger.info('📋 [INFO] Creating user profile', {
      userId: user_id,
      email: sanitizedData.email,
      sanitizedData,
      timestamp: new Date().toISOString()
    });

    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Check if user already exists
      const userExists = await checkUserExists(sanitizedData.user_id, sanitizedData.email);
      if (userExists) {
        logger.warn('🚫 [WARN] User already exists', {
          userId: sanitizedData.user_id,
          email: sanitizedData.email,
          timestamp: new Date().toISOString()
        });
        throw new Error('User already exists');
      }

      // Insert user into `users` table
      const userResult = await insertUser({
        user_id: sanitizedData.user_id,
        email: sanitizedData.email
      });

      // Insert profile into `profiles` table
      const profileResult = await insertProfile({
        user_id: sanitizedData.user_id,
        full_name: sanitizedData.full_name,
        phone: sanitizedData.phone,
        date_of_birth: sanitizedData.date_of_birth,
        address: sanitizedData.address,
        avatar_url: sanitizedData.avatar_url,
        bio: sanitizedData.bio
      });

      await client.query('COMMIT');

      logger.info('✅ [INFO] User profile created successfully', {
        userId: sanitizedData.user_id,
        email: sanitizedData.email,
        timestamp: new Date().toISOString()
      });

      res.status(201).json({
        success: true,
        message: 'User profile created successfully',
        data: {
          user: userResult,
          profile: profileResult
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    logger.error('❌ [ERROR] Failed to create user profile', {
      userId: req.body?.user_id,
      email: req.body?.email,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    if (error.message === 'User already exists') {
      return res.status(409).json({ 
        error: 'User already exists'
      });
    }

    res.status(500).json({ 
      error: 'Internal server error'
    });
  }
};

// 📊 Get all users (admin/user_admin/audit_admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = ''
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    logger.info('📋 [INFO] Fetching all users', {
      userId: req.user?.sub,
      email: req.user?.email,
      page: pageNum,
      limit: limitNum,
      search,
      timestamp: new Date().toISOString()
    });

    // Build base query
    let query = `
      SELECT 
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
      FROM profiles p
      LEFT JOIN users u ON p.user_id = u.id
    `;

    const queryParams = [];
    if (search) {
      query += ` WHERE (p.full_name ILIKE $1 OR u.email ILIKE $1)`;
      queryParams.push(`%${search}%`);
    }

    query += ` ORDER BY p.created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(limitNum, offset);

    const result = await db.query(query, queryParams);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) 
      FROM profiles p
      LEFT JOIN users u ON p.user_id = u.id
    `;
    const countParams = [];
    if (search) {
      countQuery += ` WHERE (p.full_name ILIKE $1 OR u.email ILIKE $1)`;
      countParams.push(`%${search}%`);
    }

    const countResult = await db.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);

    // Extract user roles from req.user
    const userRoles = req.user?.roles || [];

    // Filter data based on user's roles
    const filteredUsers = result.rows.map(user => 
      filterUserData(user, userRoles, false)
    );

    logger.info('✅ [INFO] All users retrieved successfully', {
      userId: req.user?.sub,
      email: req.user?.email,
      totalCount,
      page: pageNum,
      limit: limitNum,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      data: filteredUsers,
      pagination: {
        current_page: pageNum,
        per_page: limitNum,
        total_items: totalCount,
        total_pages: Math.ceil(totalCount / limitNum)
      }
    });

  } catch (error) {
    logger.error('❌ [ERROR] Failed to fetch all users', {
      userId: req.user?.sub,
      email: req.user?.email,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ 
      success: false,
      error: 'Internal server error'
    });
  }
};

// ✏️ Update user profile
exports.updateUserProfile = async (req, res) => {
  try {
    const targetUserId = req.params.id || req.user?.sub;
    const currentUserId = req.user?.sub;
    const userRole = req.user?.role || ROLES.USER;
    
    if (!targetUserId) {
      logger.warn('🚫 [WARN] Missing user ID for profile update', {
        currentUserId,
        email: req.user?.email,
        timestamp: new Date().toISOString()
      });
      return res.status(400).json({ 
        error: 'Missing user ID'
      });
    }

    // Check permissions
    const isOwnProfile = currentUserId === targetUserId;
    const userRoles = req.user?.roles || [];
    const hasPermission = userRoles.some(role =>
      PERMISSIONS.MANAGE_USERS.includes(role)
    );

    logger.info('📋 [INFO] Updating user profile', {
      targetUserId,
      currentUserId,
      isOwnProfile,
      hasPermission,
      userRole,
      email: req.user?.email,
      timestamp: new Date().toISOString()
    });

    if (!isOwnProfile && !hasPermission) {
      logger.warn('🚫 [WARN] Access denied for profile update', {
        targetUserId,
        currentUserId,
        userRoles,
        timestamp: new Date().toISOString()
      });
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    const { full_name, phone, date_of_birth, address, avatar_url, bio, role } = req.body;

    // Validate phone if provided
    if (phone && !validatePhone(phone)) {
      logger.warn('🚫 [WARN] Invalid phone format for profile update', {
        targetUserId,
        phone,
        timestamp: new Date().toISOString()
      });
      return res.status(400).json({ 
        error: 'Invalid phone format'
      });
    }

    // Role update validation
    if (role !== undefined) {
      if (!hasPermission) {
        logger.warn('🚫 [WARN] Unauthorized attempt to update role', {
          targetUserId,
          currentUserId,
          role,
          timestamp: new Date().toISOString()
        });
        return res.status(403).json({
          error: 'Cannot update role'
        });
      }

      if (!Object.values(ROLES).includes(role)) {
        logger.warn('🚫 [WARN] Invalid role for profile update', {
          targetUserId,
          role,
          timestamp: new Date().toISOString()
        });
        return res.status(400).json({
          error: 'Invalid role'
        });
      }
    }

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (full_name !== undefined) {
      updates.push(`full_name = $${paramIndex++}`);
      values.push(sanitizeInput(full_name));
    }
    if (phone !== undefined) {
      updates.push(`phone = $${paramIndex++}`);
      values.push(sanitizeInput(phone));
    }
    if (date_of_birth !== undefined) {
      updates.push(`date_of_birth = $${paramIndex++}`);
      values.push(date_of_birth);
    }
    if (address !== undefined) {
      updates.push(`address = $${paramIndex++}`);
      values.push(sanitizeInput(address));
    }
    if (avatar_url !== undefined) {
      updates.push(`avatar_url = $${paramIndex++}`);
      values.push(sanitizeInput(avatar_url));
    }
    if (bio !== undefined) {
      updates.push(`bio = $${paramIndex++}`);
      values.push(sanitizeInput(bio));
    }

    if (updates.length === 0 && role === undefined) {
      logger.warn('🚫 [WARN] No fields to update for profile', {
        targetUserId,
        currentUserId,
        timestamp: new Date().toISOString()
      });
      return res.status(400).json({
        error: 'No fields to update'
      });
    }

    const client = await db.connect();
    try {
      await client.query('BEGIN');

      let updatedProfile = null;
      let updatedUser = null;

      // Update profile if there are profile fields
      if (updates.length > 0) {
        updates.push(`updated_at = NOW()`);
        values.push(targetUserId);

        const profileQuery = `
          UPDATE profiles 
          SET ${updates.join(', ')}
          WHERE user_id = $${paramIndex}
          RETURNING *
        `;

        const profileResult = await client.query(profileQuery, values);
        updatedProfile = profileResult.rows[0];
      }

      await client.query('COMMIT');

      logger.info('✅ [INFO] User profile updated successfully', {
        targetUserId,
        currentUserId,
        email: req.user?.email,
        updatedFields: updates,
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          profile: updatedProfile,
          user: updatedUser
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    logger.error('❌ [ERROR] Failed to update user profile', {
      targetUserId: req.params.id || req.user?.sub,
      currentUserId: req.user?.sub,
      email: req.user?.email,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ 
      error: 'Internal server error'
    });
  }
};

// 🗑️ Delete user profile (soft delete - admin only)
exports.deleteUserProfile = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user?.sub;
    const userRoles = req.user?.roles || [];

    logger.info('📋 [INFO] Attempting to delete user profile', {
      targetUserId,
      currentUserId,
      email: req.user?.email,
      userRoles,
      timestamp: new Date().toISOString()
    });

    if (!targetUserId) {
      logger.warn('🚫 [WARN] Missing user ID for profile deletion', {
        currentUserId,
        email: req.user?.email,
        timestamp: new Date().toISOString()
      });
      return res.status(400).json({
        error: 'Missing user ID'
      });
    }

    // Check permissions (support multiple roles)
    const hasPermission = userRoles.some(role =>
      PERMISSIONS.MANAGE_USERS.includes(role)
    );

    logger.info('📋 [INFO] Checking permissions for profile deletion', {
      targetUserId,
      currentUserId,
      userRoles,
      hasPermission,
      timestamp: new Date().toISOString()
    });

    if (!hasPermission) {
      logger.warn('🚫 [WARN] Access denied for profile deletion', {
        targetUserId,
        currentUserId,
        userRoles,
        timestamp: new Date().toISOString()
      });
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    // Prevent self-deletion
    if (currentUserId === targetUserId) {
      logger.warn('🚫 [WARN] Attempt to delete own profile', {
        targetUserId,
        currentUserId,
        email: req.user?.email,
        timestamp: new Date().toISOString()
      });
      return res.status(400).json({
        error: 'Cannot delete your own account'
      });
    }

    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Check if user exists
      const userCheck = await client.query(
        'SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL',
        [targetUserId]
      );

      if (userCheck.rows.length === 0) {
        logger.warn('🚫 [WARN] User not found for deletion', {
          targetUserId,
          currentUserId,
          timestamp: new Date().toISOString()
        });
        throw new Error('User not found');
      }

      // Soft delete
      await client.query(
        'UPDATE profiles SET deleted_at = NOW() WHERE user_id = $1',
        [targetUserId]
      );

      await client.query(
        'UPDATE users SET deleted_at = NOW() WHERE id = $1',
        [targetUserId]
      );

      await client.query('COMMIT');

      logger.info('✅ [INFO] User profile deleted successfully', {
        targetUserId,
        currentUserId,
        email: req.user?.email,
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        message: 'User deleted successfully'
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    logger.error('❌ [ERROR] Failed to delete user profile', {
      targetUserId: req.params.id,
      currentUserId: req.user?.sub,
      email: req.user?.email,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    if (error.message === 'User not found') {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

// Export middleware and constants
exports.checkPermission = checkPermission;
exports.ROLES = ROLES;
exports.PERMISSIONS = PERMISSIONS;