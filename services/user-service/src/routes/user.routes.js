const express = require('express');
const {
  getProfile,
  getUserById,
  createProfile,
  getAllUsers,
  updateUserProfile
} = require('../controllers/user.controller');

const authMiddleware = require('../middlewares/auth.middleware');
const authorizeRoles = require('../middlewares/authZ.middleware');

const router = express.Router();

router.get('/profile', authMiddleware, getProfile);
router.post('/register', createProfile);

router.get('/user/:id', getUserById);
router.get('/users',getAllUsers);
router.put('/profile', authMiddleware, updateUserProfile);

module.exports = router;
