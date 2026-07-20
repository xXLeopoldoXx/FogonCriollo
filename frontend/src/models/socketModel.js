// ============================================================
// El Fogón Criollo – Socket Service
// Conexión única compartida de Socket.io en toda la app
// ============================================================

import { io } from 'socket.io-client';

const SOCKET_URL = '/';

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect:    false,
      reconnection:   true,
      reconnectionDelay: 1000,
      path: '/socket.io',
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
  PEDIDO_NUEVO:    'pedido:nuevo',     
  PEDIDO_ESTADO:   'pedido:estado',    
  CONNECTED:       'connect',
  DISCONNECTED:    'disconnect',
};
