const express = require('express');
require('dotenv').config();

const authRoutes = require('./routes/auth.routes');

const app = express();
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'Auth service running 🟢' }));

module.exports = app;
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Auth service running on port ${PORT} 🚀`);
});