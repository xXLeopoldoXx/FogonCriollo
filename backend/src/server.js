// ============================================================
//  El Fogón Criollo — server.js v2
//  Express + Socket.io + Helmet + Winston + Redis sessions
// ============================================================

require('dotenv').config();
const express     = require('express');
const http        = require('http');
const { Server }  = require('socket.io');
const cors        = require('cors');
const helmet      = require('helmet');
const compression = require('compression');
const morgan      = require('morgan');
const jwt         = require('jsonwebtoken');
const path        = require('path');
const { pool }    = require('./db/pool');
const { redis }   = require('./db/redis');
const routes      = require('./routes');
const logger      = require('./utils/logger');
const { setupSocketHandlers } = require('./services/socketService');
const { iniciarCronJobs } = require('./cron');

const app    = express();
const server = http.createServer(app);
app.disable('x-powered-by');

// ── Socket.io ─────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL ?? 'http://localhost',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 20000,
  pingInterval: 25000,
});

// Auth de socket
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    socket.user = { username: 'guest', rol: 'CLIENTE' };
    return next();
  }
  if (token.startsWith('mock-') || token.startsWith('guest-')) {
    socket.user = { username: 'dev', rol: 'MESERO' };
    return next();
  }
  try {
    socket.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    socket.user = { username: 'guest', rol: 'CLIENTE' };
    next();
  }
});

setupSocketHandlers(io);

// Helper para emitir estado de pedido a todos y a sala específica
io.emitPedidoEstado = function(id_pedido, estado) {
  io.emit('pedido:estado', { id_pedido, estado });
  io.to(`pedido:${id_pedido}`).emit('pedido:estado', { id_pedido, estado });
};

// ── Middlewares de seguridad ──────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'", "'unsafe-inline'"],
      styleSrc:   ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
      fontSrc:    ["'self'", 'fonts.gstatic.com'],
      imgSrc:     ["'self'", 'data:', 'https:', 'images.unsplash.com'],
      connectSrc: ["'self'", 'ws:', 'wss:'],
    },
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: process.env.CLIENT_URL ?? 'http://localhost',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(compression({ threshold: 1024 }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ── Logging HTTP ──────────────────────────────────────────
app.use(morgan('combined', {
  stream: { write: (msg) => logger.http(msg.trim()) },
  skip: (req) => req.url === '/health',
}));

// ── Inyectar io en cada request ───────────────────────────
app.use((req, _res, next) => {
  req.io = io;
  next();
});

// ── Archivos estáticos de exportación ─────────────────────
app.use('/exports', express.static(path.join(__dirname, '..', 'exports'), {
  maxAge: '1d',
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.xlsx') res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    if (ext === '.pdf')  res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);
  },
}));

// ── Rutas API ─────────────────────────────────────────────
app.use('/api', routes);

// ── Health check ──────────────────────────────────────────
app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    const redisOk = await redis.ping().then(r => r === 'PONG').catch(() => false);
    const memUsage = process.memoryUsage();
    res.json({
      status:   'ok',
      version:  '2.0.0',
      db:       'connected',
      redis:    redisOk ? 'connected' : 'disconnected',
      uptime:   Math.floor(process.uptime()),
      memory: {
        heapUsed:  Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
      },
      time: new Date().toISOString(),
    });
  } catch (err) {
    logger.error('Health check failed', { error: err.message });
    res.status(503).json({ status: 'error', db: 'disconnected', error: err.message });
  }
});

// ── 404 y manejo de errores ───────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ message: 'Ruta no encontrada.' });
});

app.use((err, _req, res, _next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  const status = err.status ?? err.statusCode ?? 500;
  res.status(status).json({
    message: process.env.NODE_ENV === 'production' ? 'Error interno del servidor' : err.message,
  });
});

// ── Inicio ────────────────────────────────────────────────
const PORT = process.env.PORT ?? 3000;
server.listen(PORT, '0.0.0.0', async () => {
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info('🔥 El Fogón Criollo — Backend v2.0 iniciado');
  logger.info(`   API:    http://localhost:${PORT}/api`);
  logger.info(`   Health: http://localhost:${PORT}/health`);
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Warm up DB pool
  try {
    await pool.query('SELECT 1');
    logger.info('✓ PostgreSQL conectado');
  } catch (err) {
    logger.error('✗ PostgreSQL no disponible', { error: err.message });
  }

  try {
    await redis.ping();
    logger.info('✓ Redis conectado');
  } catch (err) {
    logger.warn('✗ Redis no disponible (modo sin caché)', { error: err.message });
  }

  iniciarCronJobs();
});

// Graceful shutdown
async function shutdown(signal) {
  logger.info(`${signal} recibido. Apagando gracefully...`);
  server.close(async () => {
    await pool.end();
    redis.disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

module.exports = { app, server, io };
