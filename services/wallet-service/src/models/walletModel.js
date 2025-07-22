const db = require('../config/db');

// Find wallet by userId (optional currency)
exports.findByUserId = async (userId, currency = null) => {
  const query = currency
    ? 'SELECT * FROM wallets WHERE user_id = $1 AND currency = $2'
    : 'SELECT * FROM wallets WHERE user_id = $1 LIMIT 1';
  const result = await db.query(query, currency ? [userId, currency] : [userId]);
  return result.rows[0];
};

exports.createWallet = async ({ userId, currency }) => {
  const result = await db.query(
    `INSERT INTO wallets (user_id, currency) VALUES ($1, $2) RETURNING *`,
    [userId, currency]
  );
  return result.rows[0];
};

exports.lockWalletForUpdate = async (userId, client = db) => {
  const result = await client.query(
    `SELECT * FROM wallets WHERE user_id = $1 FOR UPDATE`,
    [userId]
  );
  return result.rows[0];
};

exports.updateBalance = async (walletId, newBalance, client = db) => {
  await client.query(
    `UPDATE wallets SET balance = $1, updated_at = NOW() WHERE id = $2`,
    [newBalance, walletId]
  );
};

exports.updateStatus = async (walletId, isActive) => {

  const result = await db.query(
    `UPDATE wallets
     SET is_active = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [isActive, walletId]
  );

  if (result.rows.length === 0) {
    throw new Error(`Wallet with ID ${walletId} not found`);
  }

  return result.rows[0];
};


exports.softDelete = async (walletId) => {
  await db.query(
    `UPDATE wallets SET is_active = FALSE, updated_at = NOW() WHERE id = $1`,
    [walletId]
  );
};

exports.findById = async (walletId) => {
  const result = await db.query('SELECT * FROM wallets WHERE id = $1', [walletId]);
  return result.rows[0];
};

exports.findAllByUserId = async (userId) => {
  const result = await db.query(
    'SELECT * FROM wallets WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  return result.rows;
};


exports.deleteWallet = async (walletId) => {
  await db.query('DELETE FROM wallets WHERE id = $1', [walletId]);
}

exports.findAll = async () => {
  const result = await db.query('SELECT * FROM wallets ORDER BY created_at DESC');
  return result.rows;
} 