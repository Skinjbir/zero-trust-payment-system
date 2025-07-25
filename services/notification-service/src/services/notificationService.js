const pool = require('../config/db');
const amqp = require('amqplib');

const AMQP_URL = process.env.AMQP_URL || 'amqp://rabbitmq';

exports.create = async ({ user_id, type, message, data }) => {
  const query = `
    INSERT INTO notifications (user_id, type, message, data)
    VALUES ($1, $2, $3, $4)
    RETURNING *`;
  const values = [user_id, type, message, data];
  const { rows } = await pool.query(query, values);
  return rows[0];
};

exports.getAll = async ({ user_id, type, limit = 50 }) => {
  let base = `SELECT * FROM notifications`;
  const values = [];
  const conditions = [];

  if (user_id) {
    conditions.push(`user_id = $${values.length + 1}`);
    values.push(user_id);
  }

  if (type) {
    conditions.push(`type = $${values.length + 1}`);
    values.push(type);
  }

  if (conditions.length) {
    base += ' WHERE ' + conditions.join(' AND ');
  }

  values.push(limit);
  base += ` ORDER BY created_at DESC LIMIT $${values.length}`;

  const { rows } = await pool.query(base, values);
  return rows;
};

exports.getById = async (id) => {
  const { rows } = await pool.query('SELECT * FROM notifications WHERE id = $1', [id]);
  return rows[0];
};

exports.sendToQueue = async (notification) => {
  const conn = await amqp.connect(AMQP_URL);
  const ch = await conn.createChannel();
  const queue = 'notifications';

  await ch.assertQueue(queue, { durable: false });
  await ch.sendToQueue(queue, Buffer.from(JSON.stringify(notification)));

  await ch.close();
  await conn.close();

  return { success: true, sent: notification };
};
