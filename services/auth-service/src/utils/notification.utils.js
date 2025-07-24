const amqp = require('amqplib');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://rabbitmq'; // fallback to Docker hostname
const QUEUE = 'notifications';

let channel, connection;

async function connect() {
  if (channel) return channel;

  connection = await amqp.connect(RABBITMQ_URL);
  channel = await connection.createChannel();
  await channel.assertQueue(QUEUE, { durable: false });

  return channel;
}

async function sendNotification(message) {
  try {
    const ch = await connect();
    ch.sendToQueue(QUEUE, Buffer.from(JSON.stringify(message)));
  } catch (error) {
    console.error('Failed to send notification:', error);
  }
}

// Optional graceful shutdown function
async function closeConnection() {
  if (channel) await channel.close();
  if (connection) await connection.close();
}

module.exports = {
  sendNotification,
  closeConnection,
};
