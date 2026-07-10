// tests/unit/PanelCocina.test.jsx
// ============================================================
//  Tests: PanelCocina — vista completa del kanban de cocina
//  Criterios de aceptación:
//   1. Muestra columnas PENDIENTE / EN_PROCESO / LISTO
//   2. Distribuye pedidos en la columna correcta
//   3. Mensaje vacío cuando una columna no tiene pedidos
//   4. Contador por columna refleja la cantidad real
//   5. Avanzar estado mueve el pedido a la columna correcta
//   6. Pedido ENTREGADO desaparece del panel
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { PanelCocina } from '../../../frontend/src/components/cocina/PanelCocina.jsx';

const makePedido = (overrides = {}) => ({
  id_pedido:   1,
  estado:      'PENDIENTE',
  numero_mesa: 1,
  piso:        1,
  mesero:      'Test',
  fecha_hora:  new Date().toISOString(),
  items:       [{ producto: 'Pollo', cantidad: 1, nota: '' }],
  ...overrides,
});

describe('PanelCocina', () => {
  let onAvanzar;

  beforeEach(() => { onAvanzar = vi.fn(); });

  // ── Columnas del kanban ─────────────────────────────────
  it('renderiza las tres columnas', () => {
    render(<PanelCocina pedidos={[]} onAvanzar={onAvanzar} />);
    expect(screen.getByText(/nuevos|pendiente/i)).toBeInTheDocument();
    expect(screen.getByText(/preparaci[oó]n|en proceso/i)).toBeInTheDocument();
    expect(screen.getByText(/listos/i)).toBeInTheDocument();
  });

  it('muestra mensaje vacío cuando no hay pedidos en una columna', () => {
    render(<PanelCocina pedidos={[]} onAvanzar={onAvanzar} />);
    // Al menos un mensaje de "sin pedidos"
    expect(screen.getAllByText(/sin pedidos/i).length).toBeGreaterThan(0);
  });

  // ── Distribución de pedidos ─────────────────────────────
  it('coloca cada pedido en su columna según el estado', () => {
    const pedidos = [
      makePedido({ id_pedido: 1, estado: 'PENDIENTE'  }),
      makePedido({ id_pedido: 2, estado: 'EN_PROCESO' }),
      makePedido({ id_pedido: 3, estado: 'LISTO'      }),
    ];
    render(<PanelCocina pedidos={pedidos} onAvanzar={onAvanzar} />);

    expect(screen.getByTestId('col-PENDIENTE')).toContainElement(
      screen.getByText(/#1/i)
    );
    expect(screen.getByTestId('col-EN_PROCESO')).toContainElement(
      screen.getByText(/#2/i)
    );
    expect(screen.getByTestId('col-LISTO')).toContainElement(
      screen.getByText(/#3/i)
    );
  });

  it('muestra el contador correcto por columna', () => {
    const pedidos = [
      makePedido({ id_pedido: 1, estado: 'PENDIENTE' }),
      makePedido({ id_pedido: 2, estado: 'PENDIENTE' }),
      makePedido({ id_pedido: 3, estado: 'LISTO'     }),
    ];
    render(<PanelCocina pedidos={pedidos} onAvanzar={onAvanzar} />);

    const colPend = screen.getByTestId('col-PENDIENTE');
    expect(within(colPend).getByTestId('contador')).toHaveTextContent('2');

    const colListo = screen.getByTestId('col-LISTO');
    expect(within(colListo).getByTestId('contador')).toHaveTextContent('1');
  });

  // ── Acciones ────────────────────────────────────────────
  it('propaga onAvanzar al hacer click en el botón de la tarjeta', () => {
    const pedido = makePedido({ id_pedido: 10, estado: 'PENDIENTE' });
    render(<PanelCocina pedidos={[pedido]} onAvanzar={onAvanzar} />);

    fireEvent.click(screen.getByRole('button', { name: /iniciar/i }));
    fireEvent.click(screen.getByRole('button', { name: /sí/i }));
    expect(onAvanzar).toHaveBeenCalledWith(10, 'EN_PROCESO');
  });

  // ── Actualización reactiva ──────────────────────────────
  it('elimina el pedido ENTREGADO de la lista visible', () => {
    const pedidos = [
      makePedido({ id_pedido: 1, estado: 'LISTO' }),
      makePedido({ id_pedido: 2, estado: 'PENDIENTE' }),
    ];
    // Simulamos que el padre actualiza la lista sin el pedido 1
    const { rerender } = render(
      <PanelCocina pedidos={pedidos} onAvanzar={onAvanzar} />
    );
    expect(screen.getByText(/#1/i)).toBeInTheDocument();

    rerender(
      <PanelCocina
        pedidos={pedidos.filter(p => p.id_pedido !== 1)}
        onAvanzar={onAvanzar}
      />
    );
    expect(screen.queryByText(/#1/i)).toBeNull();
    expect(screen.getByText(/#2/i)).toBeInTheDocument(); // intacto
  });

  it('actualiza el estado de un pedido en la columna correcta', () => {
    const pedidos = [makePedido({ id_pedido: 5, estado: 'PENDIENTE' })];
    const { rerender } = render(
      <PanelCocina pedidos={pedidos} onAvanzar={onAvanzar} />
    );
    expect(screen.getByTestId('col-PENDIENTE')).toContainElement(
      screen.getByText(/#5/i)
    );

    // Padre actualiza el estado
    rerender(
      <PanelCocina
        pedidos={[{ ...pedidos[0], estado: 'EN_PROCESO' }]}
        onAvanzar={onAvanzar}
      />
    );
    expect(screen.getByTestId('col-EN_PROCESO')).toContainElement(
      screen.getByText(/#5/i)
    );
    // Ya no está en PENDIENTE
    expect(within(screen.getByTestId('col-PENDIENTE')).queryByText(/#5/i)).toBeNull();
  });
});
