const { createLogger, format, transports } = require('winston');
require('winston-daily-rotate-file');

const fileTransport = new transports.DailyRotateFile({
  filename: 'logs/audit-service-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '10m',
  maxFiles: '7d',
  level: 'info',
});

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(({ level, message, timestamp, ...meta }) => {
          const emoji = {
            info: '📋',
            warn: '🚫',
            error: '❌',
          }[level] || '';
          // pretty print meta JSON if any
          const metaString = Object.keys(meta).length ? JSON.stringify(meta) : '';
          return `${emoji} [${level.toUpperCase()}] ${timestamp} ${message} ${metaString}`;
        })
      )
    }),
    fileTransport
  ]
});

module.exports = logger;
