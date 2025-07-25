const express = require('express');
const amqp = require('amqplib');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3004;
const AMQP_URL = process.env.AMQP_URL || 'amqp://rabbitmq';

// Middleware
app.use(express.json());
app.use(cors());

// Global variables for connection management
let connection = null;
let channel = null;
let notifications = []; // In-memory storage for demo purposes
let isConnected = false;

// Initialize RabbitMQ connection
async function initRabbitMQ() {
  try {
    connection = await amqp.connect(AMQP_URL);
    channel = await connection.createChannel();
    
    const queue = 'notifications';
    await channel.assertQueue(queue, { durable: false });
    
    console.log('Connected to RabbitMQ');
    console.log('Waiting for messages...');
    
    // Listen for notifications
    channel.consume(queue, (msg) => {
      if (msg !== null) {
        try {
          const notification = JSON.parse(msg.content.toString());
          notification.timestamp = new Date().toISOString();
          notification.id = Date.now() + Math.random(); // Simple ID generation
          
          // Store notification
          notifications.unshift(notification);
          
          // Keep only last 100 notifications
          if (notifications.length > 100) {
            notifications = notifications.slice(0, 100);
          }
          
          console.log('Received notification:', notification);
          console.log(`Notify User ${notification.user_id}: ${notification.type}`);
          
          channel.ack(msg);
        } catch (error) {
          console.error('Error processing message:', error);
          channel.nack(msg, false, false);
        }
      }
    });
    
    isConnected = true;
    
    // Handle connection errors
    connection.on('error', (err) => {
      console.error('RabbitMQ connection error:', err);
      isConnected = false;
    });
    
    connection.on('close', () => {
      console.log('RabbitMQ connection closed');
      isConnected = false;
    });
    
  } catch (error) {
    console.error('Failed to connect to RabbitMQ:', error);
    isConnected = false;
    // Retry connection after 5 seconds
    setTimeout(initRabbitMQ, 5000);
  }
}

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    rabbitmq_connected: isConnected,
    notifications_count: notifications.length
  });
});

// Get all notifications
app.get('/notifications', (req, res) => {
  const { user_id, type, limit = 50 } = req.query;
  
  let filtered = notifications;
  
  // Filter by user_id if provided
  if (user_id) {
    filtered = filtered.filter(n => n.user_id === user_id);
  }
  
  // Filter by type if provided
  if (type) {
    filtered = filtered.filter(n => n.type === type);
  }
  
  // Apply limit
  const limitNum = parseInt(limit);
  if (limitNum > 0) {
    filtered = filtered.slice(0, limitNum);
  }
  
  res.json({
    notifications: filtered,
    total: filtered.length,
    rabbitmq_connected: isConnected
  });
});

// Get notifications for specific user
app.get('/notifications/user/:userId', (req, res) => {
  const { userId } = req.params;
  const { type, limit = 50 } = req.query;
  
  let userNotifications = notifications.filter(n => n.user_id === userId);
  
  // Filter by type if provided
  if (type) {
    userNotifications = userNotifications.filter(n => n.type === type);
  }
  
  // Apply limit
  const limitNum = parseInt(limit);
  if (limitNum > 0) {
    userNotifications = userNotifications.slice(0, limitNum);
  }
  
  res.json({
    user_id: userId,
    notifications: userNotifications,
    total: userNotifications.length
  });
});

// Get notification by ID
app.get('/notifications/:id', (req, res) => {
  const { id } = req.params;
  const notification = notifications.find(n => n.id == id);
  
  if (!notification) {
    return res.status(404).json({ error: 'Notification not found' });
  }
  
  res.json(notification);
});

// Send a test notification (for testing purposes)
app.post('/notifications/send', async (req, res) => {
  if (!isConnected || !channel) {
    return res.status(503).json({ error: 'RabbitMQ not connected' });
  }
  
  const { user_id, type, message, data } = req.body;
  
  if (!user_id || !type) {
    return res.status(400).json({ 
      error: 'user_id and type are required' 
    });
  }
  
  const notification = {
    user_id,
    type,
    message: message || 'Test notification',
    data: data || {},
    created_at: new Date().toISOString()
  };
  
  try {
    const queue = 'notifications';
    await channel.sendToQueue(
      queue, 
      Buffer.from(JSON.stringify(notification)),
      { persistent: false }
    );
    
    res.json({ 
      success: true, 
      message: 'Notification sent to queue',
      notification 
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// Clear all notifications
app.delete('/notifications', (req, res) => {
  const count = notifications.length;
  notifications = [];
  res.json({ 
    success: true, 
    message: `Cleared ${count} notifications` 
  });
});

// Get notification statistics
app.get('/stats', (req, res) => {
  const stats = {
    total_notifications: notifications.length,
    rabbitmq_connected: isConnected,
    notifications_by_type: {},
    notifications_by_user: {},
    recent_activity: notifications.slice(0, 5)
  };
  
  // Count by type
  notifications.forEach(n => {
    stats.notifications_by_type[n.type] = 
      (stats.notifications_by_type[n.type] || 0) + 1;
  });
  
  // Count by user
  notifications.forEach(n => {
    stats.notifications_by_user[n.user_id] = 
      (stats.notifications_by_user[n.user_id] || 0) + 1;
  });
  
  res.json(stats);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.path 
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  
  if (channel) {
    await channel.close();
  }
  
  if (connection) {
    await connection.close();
  }
  
  process.exit(0);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Notifications microservice running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API endpoints:`);
  console.log(`  GET    /notifications`);
  console.log(`  GET    /notifications/user/:userId`);
  console.log(`  GET    /notifications/:id`);
  console.log(`  POST   /notifications/send`);
  console.log(`  DELETE /notifications`);
  console.log(`  GET    /stats`);
  console.log(`  GET    /health`);
});

// Initialize RabbitMQ connection
initRabbitMQ();