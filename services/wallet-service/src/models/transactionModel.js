const db = require('../config/db');

// Log transaction with optional pg client
exports.logTransaction = async ({
  walletId,
  type,
  amount,
  balanceSnapshot,
  referenceId = null,
  performedBy,
  role,
  metadata = {}
}, client = db) => {
  const result = await client.query(
    `INSERT INTO transactions (
      wallet_id, type, amount, balance_snapshot,
      reference_id, performed_by, role, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *`,
    [
      walletId,
      type,
      amount,
      balanceSnapshot,
      referenceId,
      performedBy,
      role,
      metadata
    ]
  );
  return result.rows[0];
};
exports.getTransactionsByWalletIds = async ({ walletIds, type, startDate, endDate, limit, offset }) => {
  const params = [];
  let query = `
    SELECT *
    FROM transactions
    WHERE wallet_id = ANY($1::uuid[])
  `;
  params.push(walletIds);

  if (type) {
    query += ` AND type = $${params.length + 1}`;
    params.push(type);
  }
  if (startDate) {
    query += ` AND created_at >= $${params.length + 1}`;
    params.push(startDate);
  }
  if (endDate) {
    query += ` AND created_at <= $${params.length + 1}`;
    params.push(endDate);
  }

  query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  const result = await db.query(query, params);
  return result.rows;
};

exports.countTransactionsByWalletIds = async (walletIds, { type, startDate, endDate }) => {
  const params = [];
  let query = `
    SELECT COUNT(*) AS count
    FROM transactions
    WHERE wallet_id = ANY($1::uuid[])
  `;
  params.push(walletIds);

  if (type) {
    query += ` AND type = $${params.length + 1}`;
    params.push(type);
  }
  if (startDate) {
    query += ` AND created_at >= $${params.length + 1}`;
    params.push(startDate);
  }
  if (endDate) {
    query += ` AND created_at <= $${params.length + 1}`;
    params.push(endDate);
  }

  const result = await db.query(query, params);
  return parseInt(result.rows[0].count, 10);
};

exports.getAllTransactions = async ({ type, startDate, endDate, limit, offset }) => {
  const params = [];
  let whereClauses = [];

  if (type) {
    params.push(type);
    whereClauses.push(`type = $${params.length}`);
  }
  if (startDate) {
    params.push(startDate);
    whereClauses.push(`created_at >= $${params.length}`);
  }
  if (endDate) {
    params.push(endDate);
    whereClauses.push(`created_at <= $${params.length}`);
  }

  const where = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const query = `
    SELECT *
    FROM transactions
    ${where}
    ORDER BY created_at DESC
    LIMIT $${params.length + 1}
    OFFSET $${params.length + 2}
  `;
  params.push(limit, offset);

  const result = await db.query(query, params);
  return result.rows;
};


exports.countAllTransactions = async ({ type, startDate, endDate }) => {
  const params = [];
  let whereClauses = [];

  if (type) {
    params.push(type);
    whereClauses.push(`type = $${params.length}`);
  }
  if (startDate) {
    params.push(startDate);
    whereClauses.push(`created_at >= $${params.length}`);
  }
  if (endDate) {
    params.push(endDate);
    whereClauses.push(`created_at <= $${params.length}`);
  }

  const where = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const query = `
    SELECT COUNT(*) AS count
    FROM transactions
    ${where}
  `;

  const result = await db.query(query, params);
  return parseInt(result.rows[0].count, 10);
};

exports.getTransactionsByUserId = async ({ walletIds, type, startDate, endDate, limit, offset }) => {
  if (!walletIds || walletIds.length === 0) return [];

  const params = [];
  let query = `
    SELECT *
    FROM transactions
    WHERE wallet_id = ANY($1)
  `;
  params.push(walletIds);

  if (type) {
    params.push(type);
    query += ` AND type = $${params.length}`;
  }
  if (startDate) {
    params.push(startDate);
    query += ` AND created_at >= $${params.length}`;
  }
  if (endDate) {
    params.push(endDate);
    query += ` AND created_at <= $${params.length}`;
  }

  query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  const result = await db.query(query, params);
  return result.rows;
};
exports.countTransactionsByWalletIds = async (walletIds, { type, startDate, endDate }) => {
  if (!walletIds || walletIds.length === 0) return 0;

  const params = [];
  let query = `
    SELECT COUNT(*) AS total
    FROM transactions
    WHERE wallet_id = ANY($1)
  `;
  params.push(walletIds);

  if (type) {
    params.push(type);
    query += ` AND type = $${params.length}`;
  }
  if (startDate) {
    params.push(startDate);
    query += ` AND created_at >= $${params.length}`;
  }
  if (endDate) {
    params.push(endDate);
    query += ` AND created_at <= $${params.length}`;
  }

  const result = await db.query(query, params);
  return parseInt(result.rows[0].total, 10);
};
