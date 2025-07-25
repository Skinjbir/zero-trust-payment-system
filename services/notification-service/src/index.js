const express = require('express');
const cors = require('cors');
const notificationRoutes = require('./routes/notificationRoutes');
const initRabbitMQ = require('./config/rabbitmq');

const app = express();
const PORT = process.env.PORT || 3004;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/notifications', notificationRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handlers
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Notification service running on port ${PORT}`);
  initRabbitMQ(); // start RabbitMQ listener
});
