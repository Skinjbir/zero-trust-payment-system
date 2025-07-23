const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const logger = require('./logger');
const logRouter = require('./routes/log.routes');
const auditRoutes = require('./routes/audit.routes');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Mount routes
app.use('/api/logs', logRouter);
app.use('/audit-log', auditRoutes);

app.get('/health', (req, res) => res.json({ status: 'Audit service running' }));

const PORT = process.env.PORT || 4001;
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 Audit service running on port ${PORT}`);
});
