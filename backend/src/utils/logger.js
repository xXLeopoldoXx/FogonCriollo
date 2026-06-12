// ============================================================
//  El Fogón Criollo — utils/logger.js
//  Winston logger con rotación diaria y niveles de color
// ============================================================

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

const { combine, timestamp, printf, colorize, errors } = winston.format;
const isProd = process.env.NODE_ENV === 'production';

// Formato pretty para desarrollo
const prettyFormat = printf(({ level, message, timestamp: ts, stack, ...meta }) => {
  const metaStr = Object.keys(meta).length
    ? '\n  ' + JSON.stringify(meta, null, 2).replace(/\n/g, '\n  ')
    : '';
  const stackStr = stack ? '\n  ' + stack.replace(/\n/g, '\n  ') : '';
  return `${ts} [${level}] ${message}${metaStr}${stackStr}`;
});

// Formato JSON para producción
const jsonFormat = combine(
  timestamp(),
  errors({ stack: true }),
  winston.format.json(),
);

const developmentFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  prettyFormat,
);

const transports = [
  new winston.transports.Console({
    level: process.env.LOG_LEVEL ?? (isProd ? 'info' : 'debug'),
    format: isProd ? jsonFormat : developmentFormat,
  }),
];

if (isProd) {
  const logDir = path.join(__dirname, '../../logs');
  transports.push(
    new DailyRotateFile({
      filename:    path.join(logDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level:       'error',
      maxFiles:    '14d',
      format:      jsonFormat,
    }),
    new DailyRotateFile({
      filename:    path.join(logDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxFiles:    '7d',
      format:      jsonFormat,
    }),
  );
}

const logger = winston.createLogger({
  levels: { ...winston.config.npm.levels, http: 5 },
  transports,
  exitOnError: false,
});

// Helper para log de requests
logger.request = (req, status, duration) => {
  const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'http';
  logger[level](`${req.method} ${req.url}`, {
    status,
    duration: `${duration}ms`,
    ip: req.ip,
    user: req.user?.username,
  });
};

module.exports = logger;
