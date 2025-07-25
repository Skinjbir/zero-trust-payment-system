const amqp = require('amqplib');
const consumeNotifications = require('../consumers/notificationConsumer');

const AMQP_URL = process.env.AMQP_URL || 'amqp://rabbitmq';

async function initRabbitMQ() {
  try {
    const connection = await amqp.connect(AMQP_URL);
    const channel = await connection.createChannel();

    const queue = 'notifications';
    await channel.assertQueue(queue, { durable: false });

    consumeNotifications(channel, queue); // Start consuming
    console.log('RabbitMQ connected and listening...');
  } catch (err) {
    console.error('RabbitMQ connection failed:', err);
    setTimeout(initRabbitMQ, 5000); // Retry
  }
}

module.exports = initRabbitMQ;
