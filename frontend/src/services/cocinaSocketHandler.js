import { esEstadoValido } from '../models/pedidoStateMachine';

export const COCINA_SOCKET_EVENTS = Object.freeze({
  PEDIDO_NUEVO: 'pedido:nuevo',
  PEDIDO_ESTADO: 'pedido:estado',
});

export function crearSocketHandler(store, socket) {
  const onPedidoNuevo = pedido => {
    if (!pedido?.id_pedido) return;
    store.getState().agregarPedido(pedido);
  };

  const onPedidoEstado = payload => {
    if (!payload?.id_pedido || !esEstadoValido(payload.estado)) return;
    store.getState().avanzarEstado(payload.id_pedido, payload.estado);
  };

  socket.on(COCINA_SOCKET_EVENTS.PEDIDO_NUEVO, onPedidoNuevo);
  socket.on(COCINA_SOCKET_EVENTS.PEDIDO_ESTADO, onPedidoEstado);

  return {
    destroy() {
      socket.off(COCINA_SOCKET_EVENTS.PEDIDO_NUEVO, onPedidoNuevo);
      socket.off(COCINA_SOCKET_EVENTS.PEDIDO_ESTADO, onPedidoEstado);
    },
  };
}
