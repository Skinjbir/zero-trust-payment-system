const Joi = require('joi');
const { ROLES } = require('../controllers/user.controller');

// UUID validation schema
const uuidSchema = Joi.string().guid({ version: ['uuidv4'] }).required()
  .messages({
    'string.guid': 'Invalid UUID format',
    'any.required': 'User ID is required'
  });

// Email validation schema
const emailSchema = Joi.string().email().required()
  .messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  });

// Phone validation schema (optional, allows empty string)
const phoneSchema = Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).allow('').optional()
  .messages({
    'string.pattern.base': 'Please provide a valid phone number'
  });

// Date of birth validation schema (optional)
const dateOfBirthSchema = Joi.date()
  .max('now')
  .min(Joi.ref('now', { adjust: () => new Date(new Date().setFullYear(new Date().getFullYear() - 120)) }))
  .allow(null).optional()
  .messages({
    'date.max': 'Date of birth cannot be in the future',
    'date.min': 'Date of birth is too old (must be within 120 years)'
  });

// Role validation schema
const roleSchema = Joi.string().valid(...Object.values(ROLES)).required()
  .messages({
    'any.only': `Role must be one of: ${Object.values(ROLES).join(', ')}`,
    'any.required': 'Role is required'
  });

const userSchema = {
  // Schema for creating a new user
  createUser: Joi.object({
    user_id: uuidSchema,
    email: emailSchema,
    full_name: Joi.string().trim().max(100).required()
      .messages({
        'string.max': 'Full name must not exceed 100 characters',
        'any.required': 'Full name is required'
      }),
    phone: phoneSchema,
    date_of_birth: dateOfBirthSchema,
    address: Joi.string().trim().max(200).allow('').optional()
      .messages({
        'string.max': 'Address must not exceed 200 characters'
      }),
    avatar_url: Joi.string().uri().max(500).allow('').optional()
      .messages({
        'string.uri': 'Avatar URL must be a valid URL',
        'string.max': 'Avatar URL must not exceed 500 characters'
      }),
    bio: Joi.string().trim().max(500).allow('').optional()
      .messages({
        'string.max': 'Bio must not exceed 500 characters'
      }),
    role: roleSchema.default(ROLES.USER)
  }),

  // Schema for updating a user profile
  updateProfile: Joi.object({
    full_name: Joi.string().trim().max(100).optional()
      .messages({
        'string.max': 'Full name must not exceed 100 characters'
      }),
    phone: phoneSchema,
    date_of_birth: dateOfBirthSchema,
    address: Joi.string().trim().max(200).allow('').optional()
      .messages({
        'string.max': 'Address must not exceed 200 characters'
      }),
    avatar_url: Joi.string().uri().max(500).allow('').optional()
      .messages({
        'string.uri': 'Avatar URL must be a valid URL',
        'string.max': 'Avatar URL must not exceed 500 characters'
      }),
    bio: Joi.string().trim().max(500).allow('').optional()
      .messages({
        'string.max': 'Bio must not exceed 500 characters'
      }),
    role: roleSchema.optional()
  }).min(1).message('At least one field must be provided for update'),

  // Schema for user ID parameter
  userIdParam: Joi.object({
    userId: uuidSchema
  }),
  

  // Schema for querying users (pagination and filtering)
  userQuery: Joi.object({
    page: Joi.number().integer().min(1).default(1)
      .messages({
        'number.min': 'Page must be at least 1'
      }),
    limit: Joi.number().integer().min(1).max(100).default(10)
      .messages({
        'number.min': 'Limit must be at least 1',
        'number.max': 'Limit must not exceed 100'
      }),
    sort_by: Joi.string().valid('created_at', 'updated_at', 'full_name', 'email', 'role').default('created_at')
      .messages({
        'any.only': 'Sort by must be one of: created_at, updated_at, full_name, email, role'
      }),
    sort_order: Joi.string().valid('ASC', 'DESC').insensitive().default('DESC')
      .messages({
        'any.only': 'Sort order must be ASC or DESC'
      }),
    search: Joi.string().trim().max(100).allow('').optional()
      .messages({
        'string.max': 'Search term must not exceed 100 characters'
      }),
    role_filter: Joi.string().valid(...Object.values(ROLES)).allow('').optional()
      .messages({
        'any.only': `Role filter must be one of: ${Object.values(ROLES).join(', ')}`
      })
  }),

  // Schema for changing user role
  changeRole: Joi.object({
    userId: uuidSchema,
    newRole: roleSchema
  })
};

module.exports = { userSchema };