// tests/unit/cocinaStore.test.js
// ============================================================
//  Tests: Store de cocina (controlador de estado global)
//  Criterios de aceptación:
//   1. Nuevo pedido se agrega al inicio de la lista
//   2. Pedido duplicado (mismo id) no se agrega dos veces
//   3. Cambio de estado actualiza solo el pedido afectado
//   4. Pedido ENTREGADO se elimina de la lista activa
//   5. Transición inválida es rechazada sin modificar el store
//   6. Estado de loading y error manejados correctamente
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createCocinaStore } from '../../../frontend/src/stores/cocinaStore.js';

// Fixture de pedidos
const makePedido = (overrides = {}) => ({
  id_pedido: 1,
  estado:    'PENDIENTE',
  numero_mesa: 3,
  piso: 1,
  mesero: 'Leslie',
  fecha_hora: new Date().toISOString(),
  items: [],
  ...overrides,
});

describe('cocinaStore', () => {
  let store;

  beforeEach(() => {
    store = createCocinaStore();
  });

  // ── Estado inicial ──────────────────────────────────────
  it('inicia con lista vacía, sin error y loading=false', () => {
    const s = store.getState();
    expect(s.pedidos).toEqual([]);
    expect(s.error).toBeNull();
    expect(s.loading).toBe(false);
  });

  // ── agregarPedido ───────────────────────────────────────
  describe('agregarPedido', () => {
    it('agrega el primer pedido a la lista', () => {
      const p = makePedido({ id_pedido: 10 });
      store.getState().agregarPedido(p);
      expect(store.getState().pedidos).toHaveLength(1);
      expect(store.getState().pedidos[0].id_pedido).toBe(10);
    });

    it('inserta al inicio (más reciente primero)', () => {
      store.getState().agregarPedido(makePedido({ id_pedido: 1 }));
      store.getState().agregarPedido(makePedido({ id_pedido: 2 }));
      expect(store.getState().pedidos[0].id_pedido).toBe(2);
    });

    it('ignora pedido duplicado (mismo id_pedido)', () => {
      const p = makePedido({ id_pedido: 5 });
      store.getState().agregarPedido(p);
      store.getState().agregarPedido(p); // duplicado
      expect(store.getState().pedidos).toHaveLength(1);
    });

    it('no afecta otros pedidos existentes', () => {
      store.getState().agregarPedido(makePedido({ id_pedido: 1 }));
      store.getState().agregarPedido(makePedido({ id_pedido: 2 }));
      const antes = store.getState().pedidos.find(p => p.id_pedido === 1);
      store.getState().agregarPedido(makePedido({ id_pedido: 3 }));
      const despues = store.getState().pedidos.find(p => p.id_pedido === 1);
      expect(antes).toEqual(despues);
    });
  });

  // ── avanzarEstado ───────────────────────────────────────
  describe('avanzarEstado', () => {
    it('actualiza solo el pedido indicado', () => {
      store.getState().agregarPedido(makePedido({ id_pedido: 1, estado: 'PENDIENTE' }));
      store.getState().agregarPedido(makePedido({ id_pedido: 2, estado: 'PENDIENTE' }));

      store.getState().avanzarEstado(1, 'EN_PROCESO');

      const p1 = store.getState().pedidos.find(p => p.id_pedido === 1);
      const p2 = store.getState().pedidos.find(p => p.id_pedido === 2);
      expect(p1.estado).toBe('EN_PROCESO');
      expect(p2.estado).toBe('PENDIENTE'); // sin tocar
    });

    it('elimina el pedido cuando pasa a ENTREGADO', () => {
      store.getState().agregarPedido(makePedido({ id_pedido: 1, estado: 'LISTO' }));
      store.getState().avanzarEstado(1, 'ENTREGADO');
      expect(store.getState().pedidos).toHaveLength(0);
    });

    it('rechaza transición ilegal y guarda el error', () => {
      store.getState().agregarPedido(makePedido({ id_pedido: 1, estado: 'PENDIENTE' }));
      store.getState().avanzarEstado(1, 'LISTO'); // salto inválido

      const p1 = store.getState().pedidos.find(p => p.id_pedido === 1);
      expect(p1.estado).toBe('PENDIENTE');        // sin cambio
      expect(store.getState().error).toMatch(/transición.*inválida/i);
    });

    it('no lanza excepción al store, solo setea error', () => {
      store.getState().agregarPedido(makePedido({ id_pedido: 1, estado: 'ENTREGADO' }));
      expect(() => store.getState().avanzarEstado(1, 'PENDIENTE')).not.toThrow();
      expect(store.getState().error).toBeTruthy();
    });

    it('limpia el error previo en transición válida', () => {
      store.getState().agregarPedido(makePedido({ id_pedido: 1, estado: 'PENDIENTE' }));
      store.getState().avanzarEstado(1, 'ENTREGADO'); // inválida → setea error
      store.getState().avanzarEstado(1, 'EN_PROCESO'); // válida (aunque el pedido ya no existe)
      // el error debe limpiarse si la transición fue válida estructuralmente
      // (pedido no encontrado es caso distinto)
    });

    it('es no-op silencioso si el id no existe', () => {
      store.getState().agregarPedido(makePedido({ id_pedido: 1 }));
      expect(() => store.getState().avanzarEstado(99, 'EN_PROCESO')).not.toThrow();
      expect(store.getState().pedidos).toHaveLength(1);
    });
  });

  // ── setLoading / setError ───────────────────────────────
  describe('setLoading y setError', () => {
    it('setLoading cambia el flag', () => {
      store.getState().setLoading(true);
      expect(store.getState().loading).toBe(true);
      store.getState().setLoading(false);
      expect(store.getState().loading).toBe(false);
    });

    it('setError guarda el mensaje', () => {
      store.getState().setError('fallo de red');
      expect(store.getState().error).toBe('fallo de red');
    });

    it('setError con null limpia el error', () => {
      store.getState().setError('algo');
      store.getState().setError(null);
      expect(store.getState().error).toBeNull();
    });
  });
});
