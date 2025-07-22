const { validationResult } = require('express-validator');
const crypto = require('crypto');
const CONFIG = require('../config/walletSettings').CONFIG;
// Utility functions
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

const generateTransactionId = () => {
  return crypto.randomBytes(16).toString('hex');
};

const formatAmount = (amount) => {
  return parseFloat(parseFloat(amount).toFixed(CONFIG.DECIMAL_PLACES));
};

const logTransaction = (type, details, error = null) => {
  const timestamp = new Date().toISOString();
  const logLevel = error ? 'ERROR' : 'INFO';
  const separator = '='.repeat(50);
  
  console.log(`\n${separator}`);
  console.log(`[${logLevel}] ${type.toUpperCase()} - ${timestamp}`);
  console.log(`${separator}`);
  
  Object.entries(details).forEach(([key, value]) => {
    console.log(`${key.padEnd(20)}: ${value}`);
  });
  
  if (error) {
    console.log(`Error: ${error.message}`);
    console.log(`Stack: ${error.stack}`);
  }
  
  console.log(`${separator}\n`);
};

module.exports = {
    handleValidationErrors,
    generateTransactionId,
    formatAmount,
    logTransaction
};



