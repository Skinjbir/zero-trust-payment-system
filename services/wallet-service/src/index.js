require('dotenv').config();
const express = require('express');
const routes = require('./routes/index');
const db = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(express.json());

// Routes
app.use('/api', routes);

// Healthcheck
app.get('/health', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW()');
    res.json({ status: 'ok', time: result.rows[0].now });
  } catch (err) {
    console.error('Health check failed', err);
    res.status(500).json({ status: 'error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Wallet service running on http://localhost:${PORT}`);
});
