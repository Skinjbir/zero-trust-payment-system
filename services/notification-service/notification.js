const amqp = require('amqplib');

async function listenNotifications() {
    const amqpUrl = process.env.AMQP_URL || 'amqp://rabbitmq';
    const connection = await amqp.connect(amqpUrl);
  const channel = await connection.createChannel();
  const queue = 'notifications';

  await channel.assertQueue(queue, { durable: false });
  console.log("Waiting for messages...");

  channel.consume(queue, (msg) => {
    if (msg !== null) {
      const notification = JSON.parse(msg.content.toString());
      console.log(notification);
      console.log(`Notify User ${notification.user_id}: ${notification.type}`);
      channel.ack(msg);
    }
  });
}

listenNotifications().catch(console.error);
