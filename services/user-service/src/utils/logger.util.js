const { createLogger, format, transports, Transport } = require('winston');
const axios = require('axios');
require('winston-daily-rotate-file');

const AUDIT_SERVICE_URL = process.env.AUDIT_SERVICE_URL || 'http://audit-service:4003/api/logs';

// 📤 Custom HTTP transport for sending logs
class HttpTransport extends Transport {
  constructor(opts = {}) {
    super(opts);
    this.level = opts.level || 'info';
  }

  async log(info, callback) {
    setImmediate(() => this.emit('logged', info));

    try {
      await axios.post(AUDIT_SERVICE_URL, {
        level: info.level,
        message: info.message,
        meta: info.meta || {},
        timestamp: info.timestamp || new Date().toISOString()
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000
      });
    } catch (err) {
      console.error('❌ Failed to send log to audit service:', err.message);
    }

    callback();
  }
}

// 📁 Daily rotated file transport
const fileTransport = new transports.DailyRotateFile({
  filename: 'logs/auth-service-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '10m',
  maxFiles: '7d',
  level: 'info'
});

// 🧠 Winston logger
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
        format.printf(({ level, message, meta, timestamp }) => {
          const emoji = {
            info: '📋',
            warn: '⚠️',
            error: '❌'
          }[level] || '📝';
          return `${emoji} [${timestamp}] [${level.toUpperCase()}] ${message} ${meta ? JSON.stringify(meta) : ''}`;
        })
      )
    }),
    fileTransport,
    new HttpTransport({ level: 'info' }) // send all logs to audit service via HTTP
  ]
});

module.exports = logger;
