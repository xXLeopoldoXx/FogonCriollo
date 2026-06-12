// ============================================================
//  El Fogón Criollo — services/socketService.js
//  Configuración de handlers de Socket.io
// ============================================================

const logger = require('../utils/logger');

function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    const { username, rol } = socket.user ?? {};
    logger.info(`Socket conectado: ${username} (${rol}) [${socket.id}]`);

    // Clientes pueden unirse a sala de su pedido
    socket.on('join:pedido', (idPedido) => {
      if (idPedido) {
        socket.join(`pedido:${idPedido}`);
        logger.debug(`Socket unido a pedido:${idPedido}`);
      }
    });

    socket.on('disconnect', (reason) => {
      logger.debug(`Socket desconectado: ${username} — ${reason}`);
    });

    socket.on('error', (err) => {
      logger.warn('Socket error', { error: err.message, user: username });
    });
  });
}

module.exports = { setupSocketHandlers };
