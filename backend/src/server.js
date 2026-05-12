// ============================================================
// El Fogón Criollo – server.js
// Punto de entrada: Express + Socket.io + PostgreSQL
// ============================================================

require('dotenv').config();

const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');
const jwt        = require('jsonwebtoken');
const { pool }   = require('./db/pool');
const routes     = require('./routes');

const app    = express();
const server = http.createServer(app);

/* ── Logger helper ───────────────────────────────────── */
function log(nivel, modulo, msg) {
  const ts = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`[${ts}] [${nivel}] [${modulo}] ${msg}`);
}

/* ── Socket.io ────────────────────────────────────────── */
const io = new Server(server, {
  cors: {
    origin:  process.env.CLIENT_URL ?? 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

// Autenticación de socket: acepta JWT, tokens mock y conexiones guest (clientes)
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;

  // Sin token o token vacío → conexión guest (vista del cliente)
  if (!token) {
    socket.user = { username: 'guest', rol: 'CLIENTE' };
    return next();
  }

  // Token mock para desarrollo
  if (token.startsWith('mock-') || token.startsWith('guest-')) {
    socket.user = { username: 'dev', rol: 'MESERO' };
    return next();
  }

  // JWT real
  try {
    socket.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    // En lugar de rechazar, permitir como guest con permisos limitados
    socket.user = { username: 'guest', rol: 'CLIENTE' };
    next();
  }
});

io.on('connection', (socket) => {
  const { username, rol } = socket.user ?? {};
  log('INFO', 'Socket', `Conectado: ${username} (${rol}) [${socket.id}]`);

  // Los clientes pueden unirse a la sala de su pedido específico
  socket.on('join:pedido', (idPedido) => {
    if (rol === 'CLIENTE' && idPedido) {
      socket.join(`pedido:${idPedido}`);
      log('INFO', 'Socket', `Guest unido a sala pedido:${idPedido}`);
    }
  });

  socket.on('disconnect', (reason) => {
    log('INFO', 'Socket', `Desconectado: ${username} — ${reason}`);
  });
});

// Helper para emitir a todos Y a la sala específica del pedido
io.emitPedidoEstado = function (id_pedido, estado) {
  io.emit('pedido:estado', { id_pedido, estado });
  io.to(`pedido:${id_pedido}`).emit('pedido:estado', { id_pedido, estado });
};

/* ── Express middleware ───────────────────────────────── */
app.use(cors({ origin: process.env.CLIENT_URL ?? 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));

// Adjuntar io a cada request
app.use((req, _res, next) => {
  req.io = io;
  next();
});

// Rate limiting simple en login (sin dependencias extra)
const loginAttempts = new Map();
app.use('/api/auth/login', (req, res, next) => {
  const ip  = req.ip ?? req.socket.remoteAddress;
  const now = Date.now();
  const entry = loginAttempts.get(ip) ?? { count: 0, since: now };

  // Resetear ventana de 1 minuto
  if (now - entry.since > 60_000) {
    entry.count = 0;
    entry.since = now;
  }

  entry.count++;
  loginAttempts.set(ip, entry);

  if (entry.count > 10) {
    return res.status(429).json({
      message: 'Demasiados intentos de login. Espera 1 minuto.',
    });
  }
  next();
});

/* ── Rutas ────────────────────────────────────────────── */
app.use('/api', routes);

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected', time: new Date().toISOString() });
  } catch {
    res.status(500).json({ status: 'error', db: 'disconnected' });
  }
});

// 404 para rutas desconocidas
app.use((_req, res) => {
  res.status(404).json({ message: 'Ruta no encontrada.' });
});

/* ── Inicio ───────────────────────────────────────────── */
const PORT = process.env.PORT ?? 3000;
server.listen(PORT, '0.0.0.0', () => {
  log('INFO', 'Server', '');
  log('INFO', 'Server', '🔥 El Fogón Criollo – Backend iniciado');
  log('INFO', 'Server', `   API:    http://localhost:${PORT}/api`);
  log('INFO', 'Server', `   Health: http://localhost:${PORT}/health`);
  log('INFO', 'Server', `   LAN:    http://<tu-ip>:${PORT}/api`);
  log('INFO', 'Server', '');
});
