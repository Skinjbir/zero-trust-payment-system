const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const verifyToken = require('../middlewares/auth.middleware');
const { requirePermission } = require('../middlewares/rbac.middleware');

// Admin wallet management
router.get('/all', 
  verifyToken, 
  requirePermission('view_all_wallets'), 
  walletController.getAllWallets
);

router.get('/:walletId', 
  verifyToken, 
  requirePermission('view_all_wallets'), 
  walletController.getWalletById
);

router.get('/user/:userId', 
  verifyToken, 
  requirePermission('view_user_wallets'), 
  walletController.getUserWallets
);

router.put('/user/:walletId/activate', 
  verifyToken, 
  requirePermission('manage_wallet_status'), 
  walletController.activateWallet
);

router.put('/user/:walletId/deactivate', 
  verifyToken, 
  requirePermission('manage_wallet_status'), 
  walletController.deactivateWallet
);

// System transactions
router.get('/transactions/all', 
  verifyToken, 
  requirePermission('view_all_transactions'), 
  walletController.getAllSystemTransactions
);

module.exports = router;
