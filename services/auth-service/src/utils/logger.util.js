const { createLogger, format, transports } = require('winston');
require('winston-daily-rotate-file');

const fileTransport = new transports.DailyRotateFile({
  filename: 'logs/auth-service-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '10m',
  maxFiles: '7d',
  level: 'info'
});

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [
    new transports.Console(),
    fileTransport
  ]
});

module.exports = logger;
