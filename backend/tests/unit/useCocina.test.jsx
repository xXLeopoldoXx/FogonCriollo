// tests/unit/useCocina.test.jsx
// ============================================================
//  Tests: Hook useCocina
//  Criterios de aceptación:
//   1. Carga inicial: llama a la API y rellena el store
//   2. Estado loading mientras carga, false al terminar
//   3. Error de red queda en store.error
//   4. avanzarEstado llama a la API y actualiza el store optimísticamente
//   5. Si la API rechaza, hace rollback del estado
//   6. pedidoNuevo vía socket se refleja en pedidos
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCocina } from '../../../frontend/src/hooks/useCocina.js';

vi.mock('../../../frontend/src/stores/authStore.js', () => ({
  useAuthStore: () => ({ token: 'token-test' }),
}));

vi.mock('react-hot-toast', () => ({
  default: { error: vi.fn() },
}));

// ── Mocks ─────────────────────────────────────────────────
const mockApi = {
  getPedidosCocina: vi.fn(),
  cambiarEstadoPedido: vi.fn(),
};

// Socket mock reutilizable
function makeSocket() {
  const handlers = {};
  return {
    on:      (ev, fn) => { handlers[ev] = fn; },
    off:     vi.fn(),
    emit:    vi.fn(),
    trigger: (ev, payload) => handlers[ev]?.(payload),
  };
}

// Inyectamos el socket mockeado via parámetro del hook
let mockSocket;
beforeEach(() => {
  mockSocket = makeSocket();
  vi.clearAllMocks();
});

const PEDIDO_BASE = {
  id_pedido: 1, estado: 'PENDIENTE',
  numero_mesa: 2, piso: 1, mesero: 'Leslie',
  fecha_hora: new Date().toISOString(), items: [],
};

// ── Helper: respuesta API exitosa ─────────────────────────
function mockApiOk(data) {
  mockApi.getPedidosCocina.mockResolvedValueOnce(data);
}
function mockApiError(msg = 'Error de red') {
  mockApi.getPedidosCocina.mockRejectedValueOnce(new Error(msg));
}

describe('useCocina', () => {
  // ── Carga inicial ───────────────────────────────────────
  it('inicia con loading=true mientras carga', async () => {
    mockApi.getPedidosCocina.mockReturnValueOnce(new Promise(() => {}));
    const { result } = renderHook(() => useCocina({ socket: mockSocket, api: mockApi, initialLoadDelay: 0 }));
    expect(result.current.loading).toBe(true);
  });

  it('carga los pedidos desde la API', async () => {
    mockApiOk([PEDIDO_BASE]);
    const { result } = renderHook(() => useCocina({ socket: mockSocket, api: mockApi, initialLoadDelay: 0 }));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.pedidos).toHaveLength(1);
    expect(result.current.pedidos[0].id_pedido).toBe(1);
  });

  it('setea error si la API falla', async () => {
    mockApiError('Servicio no disponible');
    const { result } = renderHook(() => useCocina({ socket: mockSocket, api: mockApi, initialLoadDelay: 0 }));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toMatch(/servicio no disponible/i);
    expect(result.current.pedidos).toHaveLength(0);
  });

  // ── avanzarEstado optimista ──────────────────────────────
  it('actualiza el pedido optimistamente antes de que responda la API', async () => {
    mockApiOk([{ ...PEDIDO_BASE, estado: 'PENDIENTE' }]);
    // Segunda llamada (PATCH) cuelga para ver el estado intermedio
    mockApi.cambiarEstadoPedido.mockReturnValueOnce(new Promise(() => {}));

    const { result } = renderHook(() => useCocina({ socket: mockSocket, api: mockApi, initialLoadDelay: 0 }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => { result.current.avanzarEstado(1, 'EN_PROCESO'); });

    const pedido = result.current.pedidos.find(p => p.id_pedido === 1);
    expect(pedido.estado).toBe('EN_PROCESO'); // actualización optimista
  });

  it('hace rollback si la API rechaza la transición', async () => {
    mockApiOk([{ ...PEDIDO_BASE, estado: 'PENDIENTE' }]);
    mockApi.cambiarEstadoPedido.mockRejectedValueOnce(new Error('Cambio no permitido'));

    const { result } = renderHook(() => useCocina({ socket: mockSocket, api: mockApi, initialLoadDelay: 0 }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { result.current.avanzarEstado(1, 'EN_PROCESO'); });
    await waitFor(() => expect(result.current.error).toBeTruthy());

    const pedido = result.current.pedidos.find(p => p.id_pedido === 1);
    expect(pedido?.estado).toBe('PENDIENTE'); // rollback
  });

  it('rechaza transición inválida sin llamar a la API', async () => {
    mockApiOk([{ ...PEDIDO_BASE, estado: 'PENDIENTE' }]);
    const { result } = renderHook(() => useCocina({ socket: mockSocket, api: mockApi, initialLoadDelay: 0 }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const callsBefore = mockApi.cambiarEstadoPedido.mock.calls.length;
    act(() => { result.current.avanzarEstado(1, 'LISTO'); }); // salto ilegal
    expect(mockApi.cambiarEstadoPedido.mock.calls.length).toBe(callsBefore); // sin llamada extra
    expect(result.current.error).toMatch(/inválida/i);
  });

  // ── Eventos socket ──────────────────────────────────────
  it('agrega pedido nuevo recibido por socket', async () => {
    mockApiOk([]);
    const { result } = renderHook(() => useCocina({ socket: mockSocket, api: mockApi, initialLoadDelay: 0 }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => { mockSocket.trigger('pedido:nuevo', PEDIDO_BASE); });
    expect(result.current.pedidos).toHaveLength(1);
  });

  it('actualiza estado recibido por socket', async () => {
    mockApiOk([{ ...PEDIDO_BASE, estado: 'PENDIENTE' }]);
    const { result } = renderHook(() => useCocina({ socket: mockSocket, api: mockApi, initialLoadDelay: 0 }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      mockSocket.trigger('pedido:estado', { id_pedido: 1, estado: 'EN_PROCESO' });
    });

    const p = result.current.pedidos.find(p => p.id_pedido === 1);
    expect(p.estado).toBe('EN_PROCESO');
  });

  it('elimina pedido cuando socket informa ENTREGADO', async () => {
    mockApiOk([{ ...PEDIDO_BASE, estado: 'LISTO' }]);
    const { result } = renderHook(() => useCocina({ socket: mockSocket, api: mockApi, initialLoadDelay: 0 }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      mockSocket.trigger('pedido:estado', { id_pedido: 1, estado: 'ENTREGADO' });
    });

    expect(result.current.pedidos).toHaveLength(0);
  });
});
