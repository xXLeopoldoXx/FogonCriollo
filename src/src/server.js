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

// ── Socket.io ────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin:  process.env.CLIENT_URL ?? 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

// Autenticación de socket con JWT
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token || token.startsWith('mock-')) {
    // Permitir tokens mock durante desarrollo
    socket.user = { username: 'dev', rol: 'MESERO' };
    return next();
  }
  try {
    socket.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    next(new Error('Token inválido'));
  }
});

io.on('connection', (socket) => {
  console.log(`[Socket] Conectado: ${socket.user?.username} (${socket.user?.rol})`);

  socket.on('disconnect', () => {
    console.log(`[Socket] Desconectado: ${socket.user?.username}`);
  });
});

// ── Express ──────────────────────────────────────────────
app.use(cors({ origin: process.env.CLIENT_URL ?? 'http://localhost:5173' }));
app.use(express.json());

// Adjuntar io a cada request para que los controllers puedan emitir eventos
app.use((req, _res, next) => {
  req.io = io;
  next();
});

// Rutas de la API
app.use('/api', routes);

// Health check
app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected', time: new Date().toISOString() });
  } catch {
    res.status(500).json({ status: 'error', db: 'disconnected' });
  }
});

// ── Inicio ───────────────────────────────────────────────
const PORT = process.env.PORT ?? 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('🔥 El Fogón Criollo – Backend iniciado');
  console.log(`   API:    http://localhost:${PORT}/api`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   LAN:    http://<tu-ip>:${PORT}/api`);
  console.log('');
});
