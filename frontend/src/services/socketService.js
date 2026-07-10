// ============================================================
//  El Fogón Criollo — services/socketService.js
//  Singleton de Socket.io con reconexión automática
// ============================================================

import { io } from 'socket.io-client';

const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3000').replace(/\/api$/, '');
let socket = null;

export const EVENTS = {
  PEDIDO_NUEVO:    'pedido:nuevo',
  PEDIDO_ESTADO:   'pedido:estado',
  CONNECTED:       'connect',
  DISCONNECTED:    'disconnect',
  ERROR:           'connect_error',
};

export function connectSocket(token) {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    auth: { token },
    reconnection:      true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 10,
    transports: ['websocket', 'polling'],
  });

  socket.on('connect_error', (err) => {
    console.warn('[Socket] Error de conexión:', err.message);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket() { return socket; }
