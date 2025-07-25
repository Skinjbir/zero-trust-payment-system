const notificationService = require('../services/notificationService');

function consumeNotifications(channel, queue) {
  channel.consume(queue, async (msg) => {
    if (msg !== null) {
      try {
        const notification = JSON.parse(msg.content.toString());
        await notificationService.create(notification);
        channel.ack(msg);
        console.log('Notification saved:', notification);
      } catch (err) {
        console.error('Consumer error:', err);
        channel.nack(msg, false, false);
      }
    }
  });
}

module.exports = consumeNotifications;
