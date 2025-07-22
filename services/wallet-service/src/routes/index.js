const express = require('express');
const userWalletRoutes = require('./wallet.user.routes');
const adminWalletRoutes = require('./wallet.admin.routes');

const router = express.Router();

router.use('/wallet', userWalletRoutes);           // /wallet/myWallet, etc
router.use('/wallet/admin', adminWalletRoutes);    // /wallet/admin/all, etc

module.exports = router;
