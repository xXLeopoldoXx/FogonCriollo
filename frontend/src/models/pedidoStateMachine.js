export const ESTADOS = Object.freeze({
  PENDIENTE: 'PENDIENTE',
  EN_PROCESO: 'EN_PROCESO',
  LISTO: 'LISTO',
  ENTREGADO: 'ENTREGADO',
});

export const TRANSICIONES = new Map([
  [ESTADOS.PENDIENTE, ESTADOS.EN_PROCESO],
  [ESTADOS.EN_PROCESO, ESTADOS.LISTO],
  [ESTADOS.LISTO, ESTADOS.ENTREGADO],
]);

export const ORDEN_COCINA = Object.freeze({
  [ESTADOS.PENDIENTE]: 0,
  [ESTADOS.EN_PROCESO]: 1,
  [ESTADOS.LISTO]: 2,
});

export function esEstadoValido(estado) {
  return Object.values(ESTADOS).includes(estado);
}

export function getNextEstado(estadoActual) {
  return TRANSICIONES.get(estadoActual) ?? null;
}

export function puedeTransicionar(desde, hasta) {
  return esEstadoValido(desde) && esEstadoValido(hasta) && getNextEstado(desde) === hasta;
}

export function aplicarTransicion(pedido, nuevoEstado, now = Date.now) {
  if (!puedeTransicionar(pedido?.estado, nuevoEstado)) {
    throw new Error(`Transición inválida: ${pedido?.estado} -> ${nuevoEstado}`);
  }
  return { ...pedido, estado: nuevoEstado, updatedAt: now() };
}

export function agregarPedidoActivo(pedidos, pedido) {
  if (!pedido?.id_pedido || pedidos.some(p => p.id_pedido === pedido.id_pedido)) return pedidos;
  return [pedido, ...pedidos];
}

export function actualizarEstadoPedido(pedidos, idPedido, nuevoEstado) {
  const pedido = pedidos.find(p => p.id_pedido === idPedido);
  if (!pedido) return pedidos;
  if (nuevoEstado === ESTADOS.ENTREGADO && puedeTransicionar(pedido.estado, nuevoEstado)) {
    return pedidos.filter(p => p.id_pedido !== idPedido);
  }
  const actualizado = aplicarTransicion(pedido, nuevoEstado);
  return pedidos.map(p => (p.id_pedido === idPedido ? actualizado : p));
}

export function ordenarPedidosCocina(pedidos) {
  return [...pedidos].sort((a, b) => {
    const diff = (ORDEN_COCINA[a.estado] ?? 9) - (ORDEN_COCINA[b.estado] ?? 9);
    return diff !== 0 ? diff : new Date(a.fecha_hora) - new Date(b.fecha_hora);
  });
}

export function contarEstadosCocina(pedidos) {
  return {
    pendiente: pedidos.filter(p => p.estado === ESTADOS.PENDIENTE).length,
    en_proceso: pedidos.filter(p => p.estado === ESTADOS.EN_PROCESO).length,
    listo: pedidos.filter(p => p.estado === ESTADOS.LISTO).length,
  };
}
