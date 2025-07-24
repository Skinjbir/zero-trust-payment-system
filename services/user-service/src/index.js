require('dotenv').config();
const express = require('express');
const userRoutes = require('./routes/user.routes');
const helmet = require('helmet')
const app = express();
app.use(express.json());
app.use(helmet())
app.use('/api/user', userRoutes);

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`User service running on port ${PORT}`);
});
