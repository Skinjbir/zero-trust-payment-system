const express = require('express');
const logger = require('../logger');

const router = express.Router();

const isValidLog = ({ level, message, timestamp }) =>
  typeof level === 'string' &&
  typeof message === 'string' &&
  typeof timestamp === 'string' &&
  ['info', 'warn', 'error'].includes(level.toLowerCase());

router.post('/', (req, res) => {
  const { level, message, meta = {}, timestamp } = req.body;

  if (!isValidLog(req.body)) {
    logger.warn('🚫 Invalid log payload received', {
      receivedPayload: req.body,
      localTimestamp: new Date().toISOString()
    });
    return res.status(400).json({
      error: 'Invalid payload. `level`, `message`, and `timestamp` are required, and level must be one of info, warn, or error.'
    });
  }

  const logLevel = level.toLowerCase();

  // Defensive check: ensure meta is an object
  const safeMeta = (meta && typeof meta === 'object') ? meta : {};

  const logMeta = {
    ...safeMeta,
    receivedTimestamp: timestamp,
    localTimestamp: new Date().toISOString()
  };

  try {
    if (typeof logger[logLevel] === 'function') {
      logger[logLevel](`📥 Received log: ${message}`, logMeta);
      console.log('--------------------------------------------------------------------')
      res.status(200).json({ success: true });
    } else {
      logger.warn(`⚠️ Unsupported log level: ${level}`, { originalPayload: req.body });
      res.status(400).json({ error: `Unsupported log level: ${level}` });
    }
  } catch (err) {
    logger.error('❌ Failed to log message', {
      error: err.message,
      stack: err.stack,
      originalPayload: req.body,
      localTimestamp: new Date().toISOString()
    });
    res.status(500).json({ error: 'Failed to process log' });
  }
});

module.exports = router;
