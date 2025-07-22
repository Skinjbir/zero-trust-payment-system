

// Updated wallet routes with RBAC
const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const verifyToken = require('../middlewares/auth.middleware');
const {ROLES,PERMISSIONS, requirePermission} = require('../middlewares/rbac.middleware');

// User wallet management routes
router.post('/myWallet', 
  verifyToken, 
  requirePermission('manage_own_wallet'), 
  walletController.createWallet
);

router.get('/myWallet', 
  verifyToken, 
  requirePermission('manage_own_wallet'), 
  walletController.getOwnWallets
);

router.delete('/myWallet', 
  verifyToken, 
  requirePermission('manage_own_wallet'), 
  walletController.deleteOwnWallet
);

router.get('/myWallet/transactions', 
  verifyToken, 
  requirePermission('wallet_transactions'), 
  walletController.getOwnTransactions
);

// Financial operation routes
router.post('/deposit', 
  verifyToken, 
  requirePermission('wallet_deposit'), 
  walletController.deposit
);

router.post('/withdraw', 
  verifyToken, 
  requirePermission('wallet_withdraw'), 
  walletController.withdraw
);

router.post('/transfer', 
  verifyToken, 
  requirePermission('wallet_transfer'), 
  walletController.transfer
);

// Administrative routes
router.get('/admin/all', 
  verifyToken, 
  requirePermission('view_all_wallets'), 
  walletController.getAllWallets
);

router.get('/admin/:walletId', 
  verifyToken, 
  requirePermission('view_all_wallets'), 
  walletController.getWalletById
);

router.get('/admin/user/:userId', 
  verifyToken, 
  requirePermission('view_user_wallets'), 
  walletController.getUserWallets
);

router.put('/admin/user/:walletId/activate', 
  verifyToken, 
  requirePermission('manage_wallet_status'), 
  walletController.activateWallet
);

router.put('/admin/user/:walletId/deactivate', 
  verifyToken, 
  requirePermission('manage_wallet_status'), 
  walletController.deactivateWallet
);

router.get('/admin/transactions/all', 
  verifyToken, 
  requirePermission('view_all_transactions'), 
  walletController.getAllSystemTransactions
);

module.exports = router;
