const Wallet = require('../models/walletModel');
const Transaction = require('../models/transactionModel');
const db = require('../config/db');

// Configuration constants
const { CONFIG } = require('../config/walletSettings');

const {
  validateWalletCreation,
  validateTransaction,
  validateTransfer,
  validateWalletId,  } = require('../middlewares/validate.middleware');

  const {handleValidationErrors,  generateTransactionId, formatAmount, logTransaction} = require('../utils/utils');

// Enhanced authentication middleware
const requireAuth = (req, res, next) => {
  if (!req.user || !req.userId) {
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Valid authentication token required'
    });
  }
  // User info is available on req.user for downstream handlers
  console.log('Authenticated user:', req.user);
  next();
};

// Optional middleware to enforce admin access if you want
const requireAdmin = (req, res, next) => {
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


// Enhanced wallet operations
exports.createWallet = [
  requireAuth,
  ...validateWalletCreation,
  handleValidationErrors,
  async (req, res) => {
    const userId = req.user.sub;
    const currency = (req.body.currency || 'USD').toUpperCase();
    const transactionId = generateTransactionId();

    try {
      // Check if wallet already exists
      const existing = await Wallet.findByUserId(userId, currency);
      if (existing) {
        return res.status(409).json({ 
          error: 'Wallet already exists',
          message: `A ${currency} wallet already exists for this user`
        });
      }

      // Create wallet with additional metadata
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

      const wallet = await Wallet.createWallet(walletData);

      logTransaction('wallet_creation', {
        'Transaction ID': transactionId,
        'User ID': userId,
        'Currency': currency,
        'Wallet ID': wallet.id
      });

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
      logTransaction('wallet_creation', {
        'Transaction ID': transactionId,
        'User ID': userId,
        'Currency': currency
      }, err);

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
      return res.status(200).json({
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
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve wallets'
      });
    }
  }
];


exports.deleteOwnWallet = [
  requireAuth,
  async (req, res) => {
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

      // Check if wallet has balance
      if (parseFloat(wallet.balance) > 0) {
        return res.status(400).json({
          error: 'Cannot delete wallet',
          message: 'Wallet must have zero balance before deletion'
        });
      }

      await Wallet.deleteWallet(wallet.id);
      
      logTransaction('wallet_deletion', {
        'User ID': userId,
        'Wallet ID': wallet.id,
        'Currency': wallet.currency
      });

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

exports.deposit = [
  requireAuth,
  ...validateTransaction,
  handleValidationErrors,
  async (req, res) => {
    const userId = req.user.sub;
    const { amount, referenceId } = req.body;
    const currency = req.body.currency?.toUpperCase() || 'USD';
    const transactionId = generateTransactionId();

    const parsedAmount = formatAmount(amount);

    let client;
    try {
      client = await db.getClient();
      await client.query('BEGIN');

      // Set transaction timeout
      await client.query(`SET statement_timeout = ${CONFIG.TRANSACTION_TIMEOUT}`);

      // Lock wallet for update with timeout
      const wallet = await Wallet.lockWalletForUpdate(userId, client, currency);
      if (!wallet) {
        throw new Error('Wallet not found or inactive');
      }
      // Check wallet status
      console.log(`Checking wallet status for user ${userId} with currency ${currency}`);
      console.log(`Wallet status: ${wallet.is_active}`);
      if (!wallet.is_active) {
  throw new Error('Wallet is not active');
}


      const currentBalance = parseFloat(wallet.balance);
      const newBalance = formatAmount(currentBalance + parsedAmount);

      // Update wallet balance
      await Wallet.updateBalance(wallet.id, newBalance, client);

      // Create transaction record
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

      await client.query('COMMIT');

      logTransaction('deposit', {
        'Transaction ID': transactionId,
        'User ID': userId,
        'Amount': parsedAmount,
        'Currency': wallet.currency,
        'Reference ID': referenceId || 'N/A',
        'New Balance': newBalance
      });

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
    const userId = req.user.sub;
    const { amount, referenceId } = req.body;
    const currency = req.body.currency?.toUpperCase() || 'USD';
    const transactionId = generateTransactionId();

    const parsedAmount = formatAmount(amount);

    let client;
    try {
      client = await db.getClient();
      await client.query('BEGIN');

      // Set transaction timeout
      await client.query(`SET statement_timeout = ${CONFIG.TRANSACTION_TIMEOUT}`);

      // Lock wallet for update
      const wallet = await Wallet.lockWalletForUpdate(userId, client, currency);
      if (!wallet) {
        throw new Error('Wallet not found or inactive');
      }

if (!wallet.is_active) {
  throw new Error('Wallet is not active');
}


      const currentBalance = parseFloat(wallet.balance);
      
      // Check sufficient balance
      if (currentBalance < parsedAmount) {
        throw new Error(`Insufficient balance. Available: ${currentBalance}, Requested: ${parsedAmount}`);
      }

      const newBalance = formatAmount(currentBalance - parsedAmount);

      // Update wallet balance
      await Wallet.updateBalance(wallet.id, newBalance, client);

      // Create transaction record
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

      await client.query('COMMIT');

      logTransaction('withdraw', {
        'Transaction ID': transactionId,
        'User ID': userId,
        'Amount': parsedAmount,
        'Currency': wallet.currency,
        'Reference ID': referenceId || 'N/A',
        'New Balance': newBalance
      });

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
      client = await db.getClient();
      await client.query('BEGIN');

      // Set transaction timeout
      await client.query(`SET statement_timeout = ${CONFIG.TRANSACTION_TIMEOUT}`);

      // Lock sender's wallet
      const senderWallet = await Wallet.lockWalletForUpdate(userId, client, currency);

      if (!senderWallet || !senderWallet.is_active ) {
          throw new Error('Sender wallet not found or inactive');
      }
      // Lock recipient's wallet
      console.log(`[TRANSFER] Locking recipient wallet for user ${recipientId}...`);
      console.log(`[TRANSFER] Using currency: ${currency}`);
      console.log(`[TRANSFER] Transaction ID: ${transactionId}`);
      console.log(`[TRANSFER] Amount to transfer: ${parsedAmount}`);
      console.log(`[TRANSFER] Reference ID: ${referenceId || 'N/A'}`);
      console.log(`[TRANSFER] Sender wallet ID: ${senderWallet.id}`);
      console.log(`[TRANSFER] Sender wallet balance: ${senderWallet.balance}`);
      console.log(`[TRANSFER] Sender wallet status: ${senderWallet.is_active}`);
      console.log(`[TRANSFER] Sender wallet currency: ${senderWallet.currency}`);
      console.log(`[TRANSFER] Recipient ID: ${recipientId}`);
      console.log(`[TRANSFER] Recipient currency: ${currency}`);
      console.log(`[TRANSFER] Recipient wallet ID: ${senderWallet.id}`);
      console.log(`[TRANSFER] Recipient wallet balance: ${senderWallet.balance}`);
      console.log(`[TRANSFER] Recipient wallet status: ${senderWallet.is_active}`);
      console.log(`[TRANSFER] Recipient wallet currency: ${senderWallet.currency}`);
      const recipientWallet = await Wallet.lockWalletForUpdate(recipientId, client, currency);
    if (!recipientWallet || !recipientWallet.is_active) {
  throw new Error('Recipient wallet not found or inactive');
}

      

      const senderBalance = parseFloat(senderWallet.balance);
      const recipientBalance = parseFloat(recipientWallet.balance);

      // Check sufficient balance
      if (senderBalance < parsedAmount) {
        throw new Error(`Insufficient balance. Available: ${senderBalance}, Requested: ${parsedAmount}`);
      }

      // Calculate new balances
      const newSenderBalance = formatAmount(senderBalance - parsedAmount);
      const newRecipientBalance = formatAmount(recipientBalance + parsedAmount);

      // Update balances
      await Wallet.updateBalance(senderWallet.id, newSenderBalance, client);
      await Wallet.updateBalance(recipientWallet.id, newRecipientBalance, client);

      // Create transaction records
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

      // Sender's transaction (debit)
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

      // Recipient's transaction (credit)
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

      await client.query('COMMIT');

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
exports.getOwnTransactions = [
  requireAuth,
  async (req, res) => {
    const userId = req.user.sub; // Authenticated user
    const currency = req.query.currency?.toUpperCase() || null;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100); // Max 100
    const offset = parseInt(req.query.offset) || 0;
    const type = req.query.type?.toLowerCase();
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    console.log(`[TRANSACTIONS] Fetching transactions for user ${userId}${currency ? ` in ${currency}` : ''}`);

    try {
      // Fetch all wallets owned by the user (optionally filtered by currency)
      const userWallets = await Wallet.findAllByUserId(userId, currency);

      if (!userWallets || userWallets.length === 0) {
        return res.status(404).json({
          error: 'Wallet not found',
          message: currency
            ? `No wallet found for this user in ${currency}`
            : 'No wallets found for this user'
        });
      }

      // Collect wallet IDs for filtering transactions
      const walletIds = userWallets.map(wallet => wallet.id);

      const filters = {
        walletIds, // Pass an array of wallet IDs for filtering
        type,
        startDate,
        endDate,
        limit,
        offset
      };

      const transactions = await Transaction.getTransactionsByWalletIds(filters);
      const totalCount = await Transaction.countTransactionsByWalletIds(walletIds, filters);

      return res.status(200).json({
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

      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve transactions'
      });
    }
  }
];



// Finance Admin endpoints
exports.getWalletById = [
  requireAuth,
  requireAdmin,
  ...validateWalletId,
  handleValidationErrors,
  async (req, res) => {
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
  async (req, res) => {
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

      const walletIds = userWallets.map(wallet => wallet.id);

      const filters = {
        walletIds,
        type,
        startDate,
        endDate,
        limit,
        offset
      };

      const transactions = await Transaction.getTransactionsByUserId(filters);
      const totalCount = await Transaction.countTransactionsByWalletIds(walletIds, filters);

      return res.status(200).json({
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
      return res.status(500).json({
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
    const limit = Math.min(parseInt(req.query.limit) || 50, 100); // Max 100
    const offset = parseInt(req.query.offset) || 0;
    const type = req.query.type?.toLowerCase();
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    try {
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

      return res.status(200).json({
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

      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve transactions'
      });
    }
  }
];


// Health check endpoint
exports.healthCheck = async (req, res) => {
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