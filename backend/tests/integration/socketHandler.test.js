// tests/integration/socketHandler.test.js
// ============================================================
//  Tests: Handler de eventos Socket.io → store
//  Criterios de aceptación:
//   1. evento pedido:nuevo → agregarPedido en store
//   2. evento pedido:estado → avanzarEstado en store
//   3. ENTREGADO via socket elimina el pedido de la UI
//   4. Un evento no afecta pedidos ajenos
//   5. Evento con payload inválido no rompe el store
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createCocinaStore }  from '../../../frontend/src/stores/cocinaStore.js';
import { crearSocketHandler } from '../../../frontend/src/services/cocinaSocketHandler.js';

const makePedido = (overrides = {}) => ({
  id_pedido: 1, estado: 'PENDIENTE',
  numero_mesa: 2, piso: 1, mesero: 'Brisa',
  fecha_hora: new Date().toISOString(), items: [],
  ...overrides,
});

describe('socketHandler', () => {
  let store;
  let socket;
  let handlers; // { onPedidoNuevo, onPedidoEstado }

  beforeEach(() => {
    store = createCocinaStore();
    // Socket mockeado: registra handlers sin conexión real
    const registered = {};
    socket = {
      on:   (event, fn) => { registered[event] = fn; },
      off:  vi.fn(),
      emit: vi.fn(),
      registered,
    };
    handlers = crearSocketHandler(store, socket);
  });

  // ── pedido:nuevo ────────────────────────────────────────
  describe('evento pedido:nuevo', () => {
    it('agrega el pedido al store', () => {
      const p = makePedido({ id_pedido: 10 });
      socket.registered['pedido:nuevo'](p);
      expect(store.getState().pedidos).toHaveLength(1);
      expect(store.getState().pedidos[0].id_pedido).toBe(10);
    });

    it('ignora payload sin id_pedido', () => {
      socket.registered['pedido:nuevo']({ estado: 'PENDIENTE' }); // sin id
      expect(store.getState().pedidos).toHaveLength(0);
    });

    it('no duplica si llega dos veces el mismo pedido', () => {
      const p = makePedido({ id_pedido: 7 });
      socket.registered['pedido:nuevo'](p);
      socket.registered['pedido:nuevo'](p);
      expect(store.getState().pedidos).toHaveLength(1);
    });
  });

  // ── pedido:estado ───────────────────────────────────────
  describe('evento pedido:estado', () => {
    it('actualiza el estado del pedido correcto', () => {
      store.getState().agregarPedido(makePedido({ id_pedido: 1, estado: 'PENDIENTE' }));
      store.getState().agregarPedido(makePedido({ id_pedido: 2, estado: 'PENDIENTE' }));

      socket.registered['pedido:estado']({ id_pedido: 1, estado: 'EN_PROCESO' });

      const p1 = store.getState().pedidos.find(p => p.id_pedido === 1);
      const p2 = store.getState().pedidos.find(p => p.id_pedido === 2);
      expect(p1.estado).toBe('EN_PROCESO');
      expect(p2.estado).toBe('PENDIENTE'); // sin tocar
    });

    it('elimina el pedido cuando el estado es ENTREGADO', () => {
      store.getState().agregarPedido(makePedido({ id_pedido: 5, estado: 'LISTO' }));
      socket.registered['pedido:estado']({ id_pedido: 5, estado: 'ENTREGADO' });
      expect(store.getState().pedidos).toHaveLength(0);
    });

    it('no rompe el store con payload inválido', () => {
      store.getState().agregarPedido(makePedido({ id_pedido: 1 }));
      expect(() => socket.registered['pedido:estado'](null)).not.toThrow();
      expect(() => socket.registered['pedido:estado']({})).not.toThrow();
      expect(store.getState().pedidos).toHaveLength(1); // intacto
    });

    it('es silencioso si el id no existe en el store', () => {
      store.getState().agregarPedido(makePedido({ id_pedido: 1 }));
      expect(() => socket.registered['pedido:estado']({ id_pedido: 99, estado: 'EN_PROCESO' }))
        .not.toThrow();
      expect(store.getState().pedidos).toHaveLength(1);
    });
  });

  // ── cleanup ─────────────────────────────────────────────
  describe('destructor', () => {
    it('cancela las suscripciones al llamar destroy', () => {
      handlers.destroy();
      expect(socket.off).toHaveBeenCalledWith('pedido:nuevo',  expect.any(Function));
      expect(socket.off).toHaveBeenCalledWith('pedido:estado', expect.any(Function));
    });
  });
});
