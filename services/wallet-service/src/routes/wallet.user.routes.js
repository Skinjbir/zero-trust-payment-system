const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const verifyToken = require('../middlewares/auth.middleware');
const { requirePermission } = require('../middlewares/rbac.middleware');

// User wallet management
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

// Financial operations
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

module.exports = router;
