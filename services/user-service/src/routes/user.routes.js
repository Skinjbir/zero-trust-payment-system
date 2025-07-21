const express = require('express');
const router = express.Router();
const {
  getProfile,
  getUserById,
  createProfile,
  getAllUsers,
  updateUserProfile,
  deleteUserProfile,
  checkPermission,
  ROLES,
  PERMISSIONS
} = require('../controllers/user.controller');

const {
  validateToken,
  validateInput
} = require('../middlewares/auth.middleware');

const {
  userSchema
} = require('../validators/user.validator');

// ========================
// 🔐 AUTHENTICATED ROUTES
// ========================

// Get own profile
router.get('/profile',
  validateToken,
  getProfile
);

// Update own profile
router.put('/profile',
  validateToken,
  validateInput(userSchema.updateProfile),
  updateUserProfile
);

// ========================
// 👥 USER MANAGEMENT
// ========================

// Create new user profile (called by auth service)
router.post('/createProfile',
  // Note: You might want to add service-to-service authentication here
  // instead of regular token validation for auth service calls
  createProfile
);

// Get user by ID (admin/user_admin/audit_admin only or own profile)
router.get('/users/:id',
  validateToken,
  getUserById
);

// Update user profile by ID (admin/user_admin only)
router.put('/users/:id',
  validateToken,
  checkPermission(PERMISSIONS.MANAGE_USERS),
  updateUserProfile
);

// Get all users with pagination (admin/user_admin/audit_admin only)
router.get('/users',
  validateToken,
  checkPermission(PERMISSIONS.READ_ALL_USERS),
  getAllUsers
);

// Delete user profile (admin/user_admin only)
router.delete('/users/:id',
  validateToken,
  checkPermission(PERMISSIONS.MANAGE_USERS),
  deleteUserProfile
);

module.exports = router;