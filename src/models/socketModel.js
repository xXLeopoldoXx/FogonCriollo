// ============================================================
// El Fogón Criollo – Socket Service
// Conexión única compartida de Socket.io en toda la app
// ============================================================

import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '')
  ?? 'http://localhost:3000';

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect:    false,
      reconnection:   true,
      reconnectionDelay: 1000,
    });
  }
  return socket;
}

export function connectSocket(token) {
  const s = getSocket();
  s.auth = { token };
  s.connect();
  return s;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

// Eventos emitidos por el mesero
export const EVENTS = {
  PEDIDO_NUEVO:    'pedido:nuevo',     // mesero → server → cocina
  PEDIDO_ESTADO:   'pedido:estado',    // cocina → server → mesero
  CONNECTED:       'connect',
  DISCONNECTED:    'disconnect',
};
