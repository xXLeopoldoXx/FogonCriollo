// tests/unit/coverage-gaps.test.jsx
// ============================================================
//  Tests para cubrir los 3 gaps de cobertura:
//  1. TarjetaPedido líneas 40/43 — loading=true con texto "Procesando"
//  2. useCocina líneas 32-33     — sin token en localStorage
//  3. pedidoStateMachine línea 19 — getNextEstado con estado final
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor }               from '@testing-library/react';
import { renderHook }                            from '@testing-library/react';

import { TarjetaPedido }    from '../../../frontend/src/components/cocina/TarjetaPedido.jsx';
import { useCocina }        from '../../../frontend/src/hooks/useCocina.js';
import { getNextEstado }    from '../../../frontend/src/models/pedidoStateMachine.js';

vi.mock('../../../frontend/src/stores/authStore.js', () => ({
  useAuthStore: () => ({ token: undefined }),
}));

vi.mock('react-hot-toast', () => ({
  default: { error: vi.fn() },
}));

// ── 1. TarjetaPedido: rama loading ────────────────────────
describe('TarjetaPedido — loading branch', () => {
  const BASE = {
    id_pedido: 1, estado: 'PENDIENTE',
    numero_mesa: 1, piso: 1, mesero: 'Test',
    fecha_hora: new Date().toISOString(),
    items: [],
  };

  it('muestra "Procesando..." en el botón cuando loading=true', () => {
    render(<TarjetaPedido pedido={BASE} onAvanzar={vi.fn()} loading={true} />);
    expect(screen.getByRole('button')).toHaveTextContent(/procesando/i);
  });

  it('muestra el label normal cuando loading=false', () => {
    render(<TarjetaPedido pedido={BASE} onAvanzar={vi.fn()} loading={false} />);
    expect(screen.getByRole('button')).toHaveTextContent(/iniciar/i);
  });
});

// ── 2. useCocina: sin token (auth headers sin token) ───────
describe('useCocina — sin token de autenticación', () => {
  beforeEach(() => {
    // Asegurar que no hay token
    if (typeof localStorage !== 'undefined') localStorage.clear();
    vi.clearAllMocks();
  });

  it('realiza la petición sin cabecera Authorization cuando no hay token', async () => {
    const mockSocket = { on: vi.fn(), off: vi.fn() };
    const api = {
      getPedidosCocina: vi.fn().mockResolvedValueOnce([]),
      cambiarEstadoPedido: vi.fn(),
    };

    const { result } = renderHook(() => useCocina({ socket: mockSocket, api, initialLoadDelay: 0 }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(api.getPedidosCocina).toHaveBeenCalledWith(undefined);
  });
});

// ── 3. pedidoStateMachine: getNextEstado con estado final ──
describe('getNextEstado — estado final y estados sin transición', () => {
  it('retorna null para ENTREGADO (estado final)', () => {
    expect(getNextEstado('ENTREGADO')).toBeNull();
  });

  it('retorna null para estado desconocido', () => {
    expect(getNextEstado('INVALIDO')).toBeNull();
  });

  it('retorna null para undefined', () => {
    expect(getNextEstado(undefined)).toBeNull();
  });
});
