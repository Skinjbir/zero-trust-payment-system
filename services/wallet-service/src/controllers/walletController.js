// walletController.js - Handles wallet and transaction operations

// Dependencies
const Wallet = require('../models/walletModel');
const Transaction = require('../models/transactionModel');
const db = require('../config/db');
const { CONFIG } = require('../config/walletSettings');
const {
  validateWalletCreation,
  validateTransaction,
  validateTransfer,
  validateWalletId,
} = require('../middlewares/validate.middleware');
const {
  handleValidationErrors,
  generateTransactionId,
  formatAmount,
  logTransaction,
} = require('../utils/utils');

// Authentication Middleware
const requireAuth = (req, res, next) => {
  // Verify user authentication
  if (!req.user || !req.userId) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Valid authentication token required'
    });
  }
  console.log('Authenticated user:', req.user);
  next();
};

// Admin Authorization Middleware
const requireAdmin = (req, res, next) => {
  // Verify admin role
  console.log('Checking admin access...');
  console.log('Authenticated user roles:', req.user.roles);
  console.log('Authenticated user ID:', req.user.sub);
  
  if (!req.user || !req.user.roles || !req.user.roles.includes('admin')) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Admin access required'
    });
  }
  next();
};

// Wallet Operations
exports.createWallet = [
  requireAuth,
  ...validateWalletCreation,
  handleValidationErrors,
  async (req, res) => {
    // Create a new wallet for authenticated user
    const userId = req.user.sub;
    const currency = (req.body.currency || 'USD').toUpperCase();
    const transactionId = generateTransactionId();

    try {
      // Check for existing wallet
      const existing = await Wallet.findByUserId(userId, currency);
      if (existing) {
        return res.status(409).json({
          error: 'Wallet already exists',
          message: `A ${currency} wallet already exists for this user`
        });
      }

      // Prepare wallet data
      const walletData = {
        userId,
        currency,
        createdBy: userId,
        metadata: {
          createdAt: new Date().toISOString(),
          userAgent: req.get('User-Agent'),
          ipAddress: req.ip
        }
      };

      // Create wallet
      const wallet = await Wallet.createWallet(walletData);

      // Log wallet creation
      logTransaction('wallet_creation', {
        'Transaction ID': transactionId,
        'User ID': userId,
        'Currency': currency,
        'Wallet ID': wallet.id
      });

      // Return success response
      res.status(201).json({
        success: true,
        message: 'Wallet created successfully',
        data: {
          wallet: {
            id: wallet.id,
            currency: wallet.currency,
            balance: wallet.balance,
            status: wallet.status,
            createdAt: wallet.createdAt
          }
        },
        transactionId
      });
    } catch (err) {
      // Log error
      logTransaction('wallet_creation', {
        'Transaction ID': transactionId,
        'User ID': userId,
        'Currency': currency
      }, err);

      // Return error response
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to create wallet',
        transactionId
      });
    }
  }
];

exports.getOwnWallets = [
  requireAuth,
  async (req, res) => {
    // Retrieve all wallets for authenticated user
    const userId = req.user.sub;
    const currency = req.query.currency?.toUpperCase() || null;
    console.log(`[WALLET] Fetching wallets for user ${userId}${currency ? ` with currency ${currency}` : ''}`);

    try {
      const wallets = await Wallet.findAllByUserId(userId, currency);
      if (wallets.length === 0) {
        return res.status(404).json({
          error: 'No wallets found',
          message: currency ? `No ${currency} wallets found for this user` : 'No wallets found for this user'
        });
      }

      // Format and return wallet data
      res.status(200).json({
        success: true,
        data: wallets.map(wallet => ({
          id: wallet.id,
          active: wallet.is_active,
          currency: wallet.currency,
          balance: wallet.balance,
          status: wallet.status,
          createdAt: wallet.created_at,
          lastUpdated: wallet.updated_at,
        }))
      });
    } catch (err) {
      logTransaction('get_own_wallets', {
        userId,
        currency: currency || 'ALL'
      }, err);
      
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve wallets'
      });
    }
  }
];

exports.deleteOwnWallet = [
  requireAuth,
  async (req, res) => {
    // Delete a wallet for authenticated user
    const userId = req.user.sub;
    const currency = req.query.currency?.toUpperCase();

    try {
      const wallet = await Wallet.findByUserId(userId, currency);
      if (!wallet) {
        return res.status(404).json({
          error: 'Wallet not found',
          message: 'No wallet found for this user'
        });
      }

      // Check if wallet has zero balance
      if (parseFloat(wallet.balance) > 0) {
        return res.status(400).json({
          error: 'Cannot delete wallet',
          message: 'Wallet must have zero balance before deletion'
        });
      }

      // Delete wallet
      await Wallet.deleteWallet(wallet.id);

      // Log deletion
      logTransaction('wallet_deletion', {
        'User ID': userId,
        'Wallet ID': wallet.id,
        'Currency': wallet.currency
      });

      // Return success response
      res.status(200).json({
        success: true,
        message: 'Wallet deleted successfully'
      });
    } catch (err) {
      logTransaction('wallet_deletion', {
        'User ID': userId,
        'Currency': currency || 'N/A'
      }, err);

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to delete wallet'
      });
    }
  }
];

// Transaction Operations
exports.getOwnTransactions = [
  requireAuth,
  async (req, res) => {
    // Retrieve transactions for authenticated user
    const userId = req.user.sub;
    const currency = req.query.currency?.toUpperCase() || null;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = parseInt(req.query.offset) || 0;
    const type = req.query.type?.toLowerCase();
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    console.log(`[TRANSACTIONS] Fetching transactions for user ${userId}${currency ? ` in ${currency}` : ''}`);

    try {
      // Fetch user wallets
      const userWallets = await Wallet.findAllByUserId(userId, currency);
      if (!userWallets || userWallets.length === 0) {
        return res.status(404).json({
          error: 'Wallet not found',
          message: currency
            ? `No wallet found for this user in ${currency}`
            : 'No wallets found for this user'
        });
      }

      // Prepare transaction filters
      const walletIds = userWallets.map(wallet => wallet.id);
      const filters = {
        walletIds,
        type,
        startDate,
        endDate,
        limit,
        offset
      };

      // Fetch transactions
      const transactions = await Transaction.getTransactionsByWalletIds(filters);
      const totalCount = await Transaction.countTransactionsByWalletIds(walletIds, filters);

      // Return transaction data with pagination
      res.status(200).json({
        success: true,
        data: {
          transactions,
          pagination: {
            limit,
            offset,
            totalCount,
            hasMore: (offset + limit) < totalCount
          }
        }
      });
    } catch (err) {
      console.error('[TRANSACTIONS] Error fetching transactions:', err);
      logTransaction('get_transactions', {
        userId,
        currency: currency || 'ALL'
      }, err);

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve transactions'
      });
    }
  }
];

exports.deposit = [
  requireAuth,
  ...validateTransaction,
  handleValidationErrors,
  async (req, res) => {
    // Process deposit to user's wallet
    const userId = req.user.sub;
    const { amount, referenceId } = req.body;
    const currency = req.body.currency?.toUpperCase() || 'USD';
    const transactionId = generateTransactionId();
    const parsedAmount = formatAmount(amount);
    let client;

    try {
      // Initialize database transaction
      client = await db.getClient();
      await client.query('BEGIN');
      await client.query(`SET statement_timeout = ${CONFIG.TRANSACTION_TIMEOUT}`);

      // Lock wallet for update
      const wallet = await Wallet.lockWalletForUpdate(userId, client, currency);
      if (!wallet) {
        throw new Error('Wallet not found or inactive');
      }
      if (!wallet.is_active) {
        throw new Error('Wallet is not active');
      }

      // Update balance
      const currentBalance = parseFloat(wallet.balance);
      const newBalance = formatAmount(currentBalance + parsedAmount);
      await Wallet.updateBalance(wallet.id, newBalance, client);

      // Log transaction
      const transactionData = {
        walletId: wallet.id,
        type: 'credit',
        amount: parsedAmount,
        balanceSnapshot: newBalance,
        referenceId: referenceId || transactionId,
        performedBy: userId,
        role: req.user.role || 'user.customer',
        metadata: {
          source: 'deposit',
          userAgent: req.get('User-Agent'),
          ipAddress: req.ip,
          transactionId
        }
      };
      await Transaction.logTransaction(transactionData, client);

      // Commit transaction
      await client.query('COMMIT');

      // Log success
      logTransaction('deposit', {
        'Transaction ID': transactionId,
        'User ID': userId,
        'Amount': parsedAmount,
        'Currency': wallet.currency,
        'Reference ID': referenceId || 'N/A',
        'New Balance': newBalance
      });

      // Return success response
      res.status(200).json({
        success: true,
        message: 'Deposit successful',
        data: {
          transactionId,
          amount: parsedAmount,
          currency: wallet.currency,
          newBalance,
          referenceId: referenceId || transactionId
        }
      });
    } catch (err) {
      if (client) await client.query('ROLLBACK');
      logTransaction('deposit', {
        'Transaction ID': transactionId,
        'User ID': userId,
        'Amount': parsedAmount,
        'Currency': currency,
        'Reference ID': referenceId || 'N/A'
      }, err);

      // Determine error status
      const statusCode = err.message.includes('not found') ? 404 :
                        err.message.includes('not active') ? 400 : 500;

      res.status(statusCode).json({
        error: statusCode === 500 ? 'Internal server error' : 'Transaction failed',
        message: err.message,
        transactionId
      });
    } finally {
      if (client) client.release();
    }
  }
];

exports.withdraw = [
  requireAuth,
  ...validateTransaction,
  handleValidationErrors,
  async (req, res) => {
    // Process withdrawal from user's wallet
    const userId = req.user.sub;
    const { amount, referenceId } = req.body;
    const currency = req.body.currency?.toUpperCase() || 'USD';
    const transactionId = generateTransactionId();
    const parsedAmount = formatAmount(amount);
    let client;

    try {
      // Initialize database transaction
      client = await db.getClient();
      await client.query('BEGIN');
      await client.query(`SET statement_timeout = ${CONFIG.TRANSACTION_TIMEOUT}`);

      // Lock wallet for update
      const wallet = await Wallet.lockWalletForUpdate(userId, client, currency);
      if (!wallet) {
        throw new Error('Wallet not found or inactive');
      }
      if (!wallet.is_active) {
        throw new Error('Wallet is not active');
      }

      // Check balance
      const currentBalance = parseFloat(wallet.balance);
      if (currentBalance < parsedAmount) {
        throw new Error(`Insufficient balance. Available: ${currentBalance}, Requested: ${parsedAmount}`);
      }

      // Update balance
      const newBalance = formatAmount(currentBalance - parsedAmount);
      await Wallet.updateBalance(wallet.id, newBalance, client);

      // Log transaction
      const transactionData = {
        walletId: wallet.id,
        type: 'debit',
        amount: parsedAmount,
        balanceSnapshot: newBalance,
        referenceId: referenceId || transactionId,
        performedBy: userId,
        role: req.user.role || 'user.customer',
        metadata: {
          source: 'withdraw',
          userAgent: req.get('User-Agent'),
          ipAddress: req.ip,
          transactionId
        }
      };
      await Transaction.logTransaction(transactionData, client);

      // Commit transaction
      await client.query('COMMIT');

      // Log success
      logTransaction('withdraw', {
        'Transaction ID': transactionId,
        'User ID': userId,
        'Amount': parsedAmount,
        'Currency': wallet.currency,
        'Reference ID': referenceId || 'N/A',
        'New Balance': newBalance
      });

      // Return success response
      res.status(200).json({
        success: true,
        message: 'Withdrawal successful',
        data: {
          transactionId,
          amount: parsedAmount,
          currency: wallet.currency,
          newBalance,
          referenceId: referenceId || transactionId
        }
      });
    } catch (err) {
      if (client) await client.query('ROLLBACK');
      logTransaction('withdraw', {
        'Transaction ID': transactionId,
        'User ID': userId,
        'Amount': parsedAmount,
        'Currency': currency,
        'Reference ID': referenceId || 'N/A'
      }, err);

      // Determine error status
      const statusCode = err.message.includes('not found') ? 404 :
                        err.message.includes('Insufficient balance') ? 400 :
                        err.message.includes('not active') ? 400 : 500;

      res.status(statusCode).json({
        error: statusCode === 500 ? 'Internal server error' : 'Transaction failed',
        message: err.message,
        transactionId
      });
    } finally {
      if (client) client.release();
    }
  }
];

exports.transfer = [
  requireAuth,
  ...validateTransfer,
  handleValidationErrors,
  async (req, res) => {
    // Process transfer between wallets
    const userId = req.user.sub;
    console.log(`[TRANSFER] User ${userId} initiating transfer...`);
    const { recipientId, amount, referenceId } = req.body;
    console.log(`[TRANSFER] User ${userId} transferring ${amount} to recipient ${recipientId}`);
    const currency = req.body.currency?.toUpperCase() || 'USD';
    const transactionId = generateTransactionId();
    const parsedAmount = formatAmount(amount);

    // Prevent self-transfer
    if (userId === recipientId) {
      return res.status(400).json({
        error: 'Invalid transfer',
        message: 'Cannot transfer to yourself'
      });
    }

    let client;
    try {
      // Initialize database transaction
      client = await db.getClient();
      await client.query('BEGIN');
      await client.query(`SET statement_timeout = ${CONFIG.TRANSACTION_TIMEOUT}`);

      // Lock wallets
      const senderWallet = await Wallet.lockWalletForUpdate(userId, client, currency);
      if (!senderWallet || !senderWallet.is_active) {
        throw new Error('Sender wallet not found or inactive');
      }

      const recipientWallet = await Wallet.lockWalletForUpdate(recipientId, client, currency);
      if (!recipientWallet || !recipientWallet.is_active) {
        throw new Error('Recipient wallet not found or inactive');
      }

      // Log transfer details
      console.log(`[TRANSFER] Transaction ID: ${transactionId}`);
      console.log(`[TRANSFER] Amount to transfer: ${parsedAmount}`);
      console.log(`[TRANSFER] Sender wallet ID: ${senderWallet.id}`);
      console.log(`[TRANSFER] Sender wallet balance: ${senderWallet.balance}`);
      console.log(`[TRANSFER] Recipient wallet ID: ${recipientWallet.id}`);
      console.log(`[TRANSFER] Recipient wallet balance: ${recipientWallet.balance}`);

      // Check balance
      const senderBalance = parseFloat(senderWallet.balance);
      const recipientBalance = parseFloat(recipientWallet.balance);
      if (senderBalance < parsedAmount) {
        throw new Error(`Insufficient balance. Available: ${senderBalance}, Requested: ${parsedAmount}`);
      }

      // Update balances
      const newSenderBalance = formatAmount(senderBalance - parsedAmount);
      const newRecipientBalance = formatAmount(recipientBalance + parsedAmount);
      await Wallet.updateBalance(senderWallet.id, newSenderBalance, client);
      await Wallet.updateBalance(recipientWallet.id, newRecipientBalance, client);

      // Log transactions
      const baseTransactionData = {
        referenceId: referenceId || transactionId,
        performedBy: userId,
        role: req.user.role || 'user.customer',
        metadata: {
          userAgent: req.get('User-Agent'),
          ipAddress: req.ip,
          transactionId
        }
      };

      await Transaction.logTransaction({
        ...baseTransactionData,
        walletId: senderWallet.id,
        type: 'debit',
        amount: parsedAmount,
        balanceSnapshot: newSenderBalance,
        metadata: {
          ...baseTransactionData.metadata,
          transferType: 'outgoing',
          recipientWalletId: recipientWallet.id,
          recipientUserId: recipientId
        }
      }, client);

      await Transaction.logTransaction({
        ...baseTransactionData,
        walletId: recipientWallet.id,
        type: 'credit',
        amount: parsedAmount,
        balanceSnapshot: newRecipientBalance,
        metadata: {
          ...baseTransactionData.metadata,
          transferType: 'incoming',
          senderWalletId: senderWallet.id,
          senderUserId: userId
        }
      }, client);

      // Commit transaction
      await client.query('COMMIT');

      // Log success
      logTransaction('transfer', {
        'Transaction ID': transactionId,
        'Sender ID': userId,
        'Recipient ID': recipientId,
        'Amount': parsedAmount,
        'Currency': currency,
        'Reference ID': referenceId || 'N/A',
        'Sender Balance': newSenderBalance,
        'Recipient Balance': newRecipientBalance
      });

      // Return success response
      res.status(200).json({
        success: true,
        message: 'Transfer successful',
        data: {
          transactionId,
          amount: parsedAmount,
          currency,
          senderBalance: newSenderBalance,
          recipientBalance: newRecipientBalance,
          referenceId: referenceId || transactionId
        }
      });
    } catch (err) {
      if (client) await client.query('ROLLBACK');
      logTransaction('transfer', {
        'Transaction ID': transactionId,
        'Sender ID': userId,
        'Recipient ID': recipientId,
        'Amount': parsedAmount,
        'Currency': currency,
        'Reference ID': referenceId || 'N/A'
      }, err);

      // Determine error status
      const statusCode = err.message.includes('not found') ? 404 :
                        err.message.includes('Insufficient balance') ? 400 :
                        err.message.includes('inactive') ? 400 : 500;

      res.status(statusCode).json({
        error: statusCode === 500 ? 'Internal server error' : 'Transaction failed',
        message: err.message,
        transactionId
      });
    } finally {
      if (client) client.release();
    }
  }
];

exports.walletDebit = [
  requireAuth,
  ...validateTransaction,
  handleValidationErrors,
  async (req, res) => {
    // Process debit from user's wallet
    const userId = req.user.sub;
    const { amount, referenceId } = req.body;
    const currency = req.body.currency?.toUpperCase() || 'USD';
    const transactionId = generateTransactionId();
    const parsedAmount = formatAmount(amount);
    let client;

    try {
      // Initialize database transaction
      client = await db.getClient();
      await client.query('BEGIN');
      await client.query(`SET statement_timeout = ${CONFIG.TRANSACTION_TIMEOUT}`);

      // Lock wallet for update
      const wallet = await Wallet.lockWalletForUpdate(userId, client, currency);
      if (!wallet) {
        throw new Error('Wallet not found or inactive');
      }
      if (!wallet.is_active) {
        throw new Error('Wallet is not active');
      }

      // Check balance
      const currentBalance = parseFloat(wallet.balance);
      if (currentBalance < parsedAmount) {
        throw new Error(`Insufficient balance. Available: ${currentBalance}, Requested: ${parsedAmount}`);
      }

      // Update balance
      const newBalance = formatAmount(currentBalance - parsedAmount);
      await Wallet.updateBalance(wallet.id, newBalance, client);

      // Log transaction
      const transactionData = {
        walletId: wallet.id,
        type: 'debit',
        amount: parsedAmount,
        balanceSnapshot: newBalance,
        referenceId: referenceId || transactionId,
        performedBy: userId,
        role: req.user.role || 'user.customer',
        metadata: {
          source: 'debit',
          userAgent: req.get('User-Agent'),
          ipAddress: req.ip,
          transactionId
        }
      };
      await Transaction.logTransaction(transactionData, client);

      // Commit transaction
      await client.query('COMMIT');

      // Log success
      logTransaction('debit', {
        'Transaction ID': transactionId,
        'User ID': userId,
        'Amount': parsedAmount,
        'Currency': wallet.currency,
        'Reference ID': referenceId || 'N/A',
        'New Balance': newBalance
      });

      // Return success response
      res.status(200).json({
        success: true,
        message: 'Debit successful',
        data: {
          transactionId,
          amount: parsedAmount,
          currency: wallet.currency,
          newBalance,
          referenceId: referenceId || transactionId
        }
      });
    } catch (err) {
      if (client) await client.query('ROLLBACK');
      logTransaction('debit', {
        'Transaction ID': transactionId,
        'User ID': userId,
        'Amount': parsedAmount,
        'Currency': currency,
        'Reference ID': referenceId || 'N/A'
      }, err);

      // Determine error status
      const statusCode = err.message.includes('not found') ? 404 :
                        err.message.includes('Insufficient balance') ? 400 :
                        err.message.includes('not active') ? 400 : 500;

      res.status(statusCode).json({
        error: statusCode === 500 ? 'Internal server error' : 'Transaction failed',
        message: err.message,
        transactionId
      });
    } finally {
      if (client) client.release();
    }
  }
];

exports.walletCredit = [
  requireAuth,
  ...validateTransaction,
  handleValidationErrors,
  async (req, res) => {
    // Process credit to user's wallet
    const userId = req.user.sub;
    const { amount, referenceId } = req.body;
    const currency = req.body.currency?.toUpperCase() || 'USD';
    const transactionId = generateTransactionId();
    const parsedAmount = formatAmount(amount);
    let client;

    try {
      // Initialize database transaction
      client = await db.getClient();
      await client.query('BEGIN');
      await client.query(`SET statement_timeout = ${CONFIG.TRANSACTION_TIMEOUT}`);

      // Lock wallet for update
      const wallet = await Wallet.lockWalletForUpdate(userId, client, currency);
      if (!wallet) {
        throw new Error('Wallet not found or inactive');
      }
      if (!wallet.is_active) {
        throw new Error('Wallet is not active');
      }

      // Update balance
      const currentBalance = parseFloat(wallet.balance);
      const newBalance = formatAmount(currentBalance + parsedAmount);
      await Wallet.updateBalance(wallet.id, newBalance, client);

      // Log transaction
      const transactionData = {
        walletId: wallet.id,
        type: 'credit',
        amount: parsedAmount,
        balanceSnapshot: newBalance,
        referenceId: referenceId || transactionId,
        performedBy: userId,
        role: req.user.role || 'user.customer',
        metadata: {
          source: 'credit',
          userAgent: req.get('User-Agent'),
          ipAddress: req.ip,
          transactionId
        }
      };
      await Transaction.logTransaction(transactionData, client);

      // Commit transaction
      await client.query('COMMIT');

      // Log success
      logTransaction('credit', {
        'Transaction ID': transactionId,
        'User ID': userId,
        'Amount': parsedAmount,
        'Currency': wallet.currency,
        'Reference ID': referenceId || 'N/A',
        'New Balance': newBalance
      });

      // Return success response
      res.status(200).json({
        success: true,
        message: 'Credit successful',
        data: {
          transactionId,
          amount: parsedAmount,
          currency: wallet.currency,
          newBalance,
          referenceId: referenceId || transactionId
        }
      });
    } catch (err) {
      if (client) await client.query('ROLLBACK');
      logTransaction('credit', {
        'Transaction ID': transactionId,
        'User ID': userId,
        'Amount': parsedAmount,
        'Currency': currency,
        'Reference ID': referenceId || 'N/A'
      }, err);

      // Determine error status
      const statusCode = err.message.includes('not found') ? 404 :
                        err.message.includes('not active') ? 400 : 500;

      res.status(statusCode).json({
        error: statusCode === 500 ? 'Internal server error' : 'Transaction failed',
        message: err.message,
        transactionId
      });
    } finally {
      if (client) client.release();
    }
  }
];

// Admin Operations
exports.getWalletById = [
  requireAuth,
  requireAdmin,
  ...validateWalletId,
  handleValidationErrors,
  async (req, res) => {
    // Retrieve wallet by ID for admin
    try {
      const wallet = await Wallet.findById(req.params.walletId);
      if (!wallet) {
        return res.status(404).json({
          error: 'Wallet not found',
          message: 'No wallet found with this ID'
        });
      }

      res.status(200).json({
        success: true,
        data: { wallet }
      });
    } catch (err) {
      logTransaction('get_wallet_by_id', {
        'Wallet ID': req.params.walletId,
        'Admin ID': req.user.sub
      }, err);

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve wallet'
      });
    }
  }
];

exports.getUserWallets = [
  requireAuth,
  requireAdmin,
  handleValidationErrors,
  async (req, res) => {
    // Retrieve all wallets for a specific user (admin only)
    try {
      const wallets = await Wallet.findAllByUserId(req.params.userId);
      res.status(200).json({
        success: true,
        data: { wallets }
      });
    } catch (err) {
      logTransaction('get_user_wallets', {
        'Target User ID': req.params.userId,
        'Admin ID': req.user.sub
      }, err);

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch wallets'
      });
    }
  }
];

exports.activateWallet = [
  requireAuth,
  requireAdmin,
  ...validateWalletId,
  handleValidationErrors,
  async (req, res) => {
    // Activate a wallet (admin only)
    try {
      const wallet = await Wallet.findById(req.params.walletId);
      if (!wallet) {
        return res.status(404).json({
          error: 'Wallet not found',
          message: 'No wallet found with this ID'
        });
      }

      await Wallet.updateStatus(req.params.walletId, 'true');
      logTransaction('wallet_activation', {
        'Wallet ID': req.params.walletId,
        'Admin ID': req.user.sub
      });

      res.status(200).json({
        success: true,
        message: 'Wallet activated successfully'
      });
    } catch (err) {
      logTransaction('wallet_activation', {
        'Wallet ID': req.params.walletId,
        'Admin ID': req.user.sub
      }, err);

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to activate wallet'
      });
    }
  }
];

exports.deactivateWallet = [
  requireAuth,
  requireAdmin,
  ...validateWalletId,
  handleValidationErrors,
  async (req, res) => {
    // Deactivate a wallet (admin only)
    try {
      const wallet = await Wallet.findById(req.params.walletId);
      if (!wallet) {
        return res.status(404).json({
          error: 'Wallet not found',
          message: 'No wallet found with this ID'
        });
      }

      await Wallet.updateStatus(req.params.walletId, 'false');
      logTransaction('wallet_deactivation', {
        'Wallet ID': req.params.walletId,
        'Admin ID': req.user.sub
      });

      res.status(200).json({
        success: true,
        message: 'Wallet deactivated successfully'
      });
    } catch (err) {
      logTransaction('wallet_deactivation', {
        'Wallet ID': req.params.walletId,
        'Admin ID': req.user.sub
      }, err);

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to deactivate wallet'
      });
    }
  }
];

exports.getAllWallets = [
  requireAuth,
  requireAdmin,
  async (req, res) => {
    // Retrieve all wallets in the system (admin only)
    try {
      const wallets = await Wallet.findAll();
      res.status(200).json({
        success: true,
        data: { wallets }
      });
    } catch (err) {
      logTransaction('get_all_wallets', {
        'Admin ID': req.user.sub
      }, err);

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch all wallets'
      });
    }
  }
];

exports.getTransactionsByUserId = [
  requireAuth,
  requireAdmin,
  async (req, res) => {
    // Retrieve transactions for a specific user (admin only)
    const userId = req.params.userId;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = parseInt(req.query.offset) || 0;
    const type = req.query.type?.toLowerCase();
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    console.log(`[TRANSACTIONS] Fetching transactions for user ${userId}`);

    try {
      const userWallets = await Wallet.findAllByUserId(userId);
      if (!userWallets || userWallets.length === 0) {
        return res.status(404).json({
          error: 'No wallets found',
          message: `No wallets found for user ${userId}`
        });
      }

      // Prepare transaction filters
      const walletIds = userWallets.map(wallet => wallet.id);
      const filters = {
        walletIds,
        type,
        startDate,
        endDate,
        limit,
        offset
      };

      // Fetch transactions
      const transactions = await Transaction.getTransactionsByUserId(filters);
      const totalCount = await Transaction.countTransactionsByWalletIds(walletIds, filters);

      // Return transaction data with pagination
      res.status(200).json({
        success: true,
        data: {
          transactions,
          pagination: {
            limit,
            offset,
            totalCount,
            hasMore: (offset + limit) < totalCount
          }
        }
      });
    } catch (err) {
      console.error('[TRANSACTIONS] Error fetching user transactions:', err);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve transactions'
      });
    }
  }
];

exports.getAllSystemTransactions = [
  requireAuth,
  requireAdmin,
  async (req, res) => {
    // Retrieve all transactions in the system (admin only)
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = parseInt(req.query.offset) || 0;
    const type = req.query.type?.toLowerCase();
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    try {
      // Fetch transactions
      const transactions = await Transaction.getAllTransactions({
        type,
        startDate,
        endDate,
        limit,
        offset
      });
      if (transactions.length === 0) {
        return res.status(404).json({
          error: 'No transactions found',
          message: 'No transactions match the provided filters'
        });
      }
      const totalCount = await Transaction.countAllTransactions({ type, startDate, endDate });

      // Return transaction data with pagination
      res.status(200).json({
        success: true,
        data: {
          transactions,
          pagination: {
            limit,
            offset,
            totalCount,
            hasMore: (offset + limit) < totalCount
          }
        }
      });
    } catch (err) {
      console.error('[TRANSACTIONS] Error fetching all transactions:', err);
      logTransaction('get_all_transactions', {
        'Admin ID': req.user.sub
      }, err);

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve transactions'
      });
    }
  }
];

// Health Check
exports.healthCheck = async (req, res) => {
  // Check database connectivity
  try {
    const client = await db.getClient();
    await client.query('SELECT 1');
    client.release();

    res.status(200).json({
      success: true,
      message: 'Wallet service is healthy',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      error: 'Service unhealthy',
      message: 'Database connection failed',
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = exports;