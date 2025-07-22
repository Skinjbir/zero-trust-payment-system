const db = require('../utils/db');
const { v4: uuidv4 } = require('uuid');

exports.insertAuditLog = async (log) => {
  const {
    service_name, user_id, action, resource,
    resource_id, status, metadata
  } = log;

  await db.query(
    `INSERT INTO audit_logs
    (id, service_name, user_id, action, resource, resource_id, status, metadata, timestamp)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())`,
    [uuidv4(), service_name, user_id, action, resource, resource_id, status, metadata]
  );
};

exports.getAuditLogs = async () => {
  const result = await db.query('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 100');
  return result.rows;
};
