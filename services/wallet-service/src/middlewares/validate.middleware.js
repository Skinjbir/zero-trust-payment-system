
const { body, param } = require('express-validator');
const CONFIG = require('../config/walletSettings').CONFIG;

const validateWalletCreation = [
  body('currency')
    .optional()
    .isIn(CONFIG.SUPPORTED_CURRENCIES)
    .withMessage(`Currency must be one of: ${CONFIG.SUPPORTED_CURRENCIES.join(', ')}`),
];


const validateTransaction = [
  body('amount')
    .isFloat({ min: CONFIG.MIN_TRANSACTION_AMOUNT, max: CONFIG.MAX_TRANSACTION_AMOUNT })
    .withMessage(`Amount must be between ${CONFIG.MIN_TRANSACTION_AMOUNT} and ${CONFIG.MAX_TRANSACTION_AMOUNT}`),
  body('referenceId')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Reference ID must be between 1 and 100 characters'),
];

const validateTransfer = [
  ...validateTransaction,
  body('recipientId')
    .notEmpty()
    .withMessage('Recipient ID is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Recipient ID must be between 1 and 100 characters'),
];

const validateWalletId = [
  param('walletId')
    .isUUID()
    .withMessage('Invalid wallet ID format'),
];

const validateUserId = [
  param('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('User ID must be between 1 and 100 characters'),
];

module.exports = {
  validateWalletCreation,
  validateTransaction,
  validateTransfer,
  validateWalletId,
  validateUserId,
};
