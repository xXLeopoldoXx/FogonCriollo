//  Tests: Componente TarjetaPedido
//  Criterios de aceptación:
//   1. Muestra número de pedido, mesa y mesero
//   2. Muestra el botón de acción correcto según el estado
//   3. LISTO no muestra botón de avance (el mesero entrega)
//   4. Click en botón llama onAvanzar con el id_pedido correcto
//   5. Estado ENTREGADO no renderiza el componente (no llega a cocina)
//   6. Muestra items del pedido
//   7. Botón deshabilitado mientras se procesa (prop loading)

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TarjetaPedido } from '../../../frontend/src/components/cocina/TarjetaPedido.jsx';

const BASE = {
  id_pedido:   7,
  estado:      'PENDIENTE',
  numero_mesa: 4,
  piso:        2,
  mesero:      'Leslie',
  fecha_hora:  new Date().toISOString(),
  items:       [
    { producto: 'Pollo entero', cantidad: 2, nota: 'sin sal' },
    { producto: 'Chicha morada', cantidad: 1, nota: '' },
  ],
};

describe('TarjetaPedido', () => {
  // ── Renderizado básico ──────────────────────────────────
  it('muestra el número de pedido', () => {
    render(<TarjetaPedido pedido={BASE} onAvanzar={vi.fn()} />);
    expect(screen.getByText(/#7/i)).toBeInTheDocument();
  }); 

  it('muestra mesa y piso', () => {
    render(<TarjetaPedido pedido={BASE} onAvanzar={vi.fn()} />);
    expect(screen.getByText(/mesa 4/i)).toBeInTheDocument();
    expect(screen.getByText(/piso 2|p2/i)).toBeInTheDocument();
  });

  it('muestra el nombre del mesero', () => {
    render(<TarjetaPedido pedido={BASE} onAvanzar={vi.fn()} />);
    expect(screen.getByText(/leslie/i)).toBeInTheDocument();
  });

  it('muestra los items del pedido', () => {
    render(<TarjetaPedido pedido={BASE} onAvanzar={vi.fn()} />);
    expect(screen.getByText(/pollo entero/i)).toBeInTheDocument();
    expect(screen.getByText(/chicha morada/i)).toBeInTheDocument();
  });

  it('muestra la nota de un item cuando existe', () => {
    render(<TarjetaPedido pedido={BASE} onAvanzar={vi.fn()} />);
    expect(screen.getByText(/sin sal/i)).toBeInTheDocument();
  });

  // ── Botones según estado ────────────────────────────────
  it('muestra "Iniciar" cuando está PENDIENTE', () => {
    render(<TarjetaPedido pedido={BASE} onAvanzar={vi.fn()} />);
    expect(screen.getByRole('button', { name: /iniciar/i })).toBeInTheDocument();
  });

  it('muestra "Marcar listo" cuando está EN_PROCESO', () => {
    const pedido = { ...BASE, estado: 'EN_PROCESO' };
    render(<TarjetaPedido pedido={pedido} onAvanzar={vi.fn()} />);
    expect(screen.getByRole('button', { name: /marcar listo/i })).toBeInTheDocument();
  });

  it('NO muestra botón de avance cuando está LISTO', () => {
    const pedido = { ...BASE, estado: 'LISTO' };
    render(<TarjetaPedido pedido={pedido} onAvanzar={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /iniciar|marcar|avanzar/i })).toBeNull();
  });

  // ── Interacción ─────────────────────────────────────────
  it('llama onAvanzar con el id correcto al hacer click', () => {
    const onAvanzar = vi.fn();
    render(<TarjetaPedido pedido={BASE} onAvanzar={onAvanzar} />);
    fireEvent.click(screen.getByRole('button', { name: /iniciar/i }));
    fireEvent.click(screen.getByRole('button', { name: /sí/i }));
    expect(onAvanzar).toHaveBeenCalledOnce();
    expect(onAvanzar).toHaveBeenCalledWith(7, 'EN_PROCESO');
  });

  it('llama onAvanzar con EN_PROCESO→LISTO desde EN_PROCESO', () => {
    const onAvanzar = vi.fn();
    const pedido = { ...BASE, estado: 'EN_PROCESO' };
    render(<TarjetaPedido pedido={pedido} onAvanzar={onAvanzar} />);
    fireEvent.click(screen.getByRole('button', { name: /marcar listo/i }));
    fireEvent.click(screen.getByRole('button', { name: /sí/i }));
    expect(onAvanzar).toHaveBeenCalledWith(7, 'LISTO');
  });

  // ── Loading ─────────────────────────────────────────────
  it('deshabilita el botón cuando loading=true', () => {
  render(<TarjetaPedido pedido={BASE} onAvanzar={vi.fn()} loading />);
  expect(screen.getByRole('button', { name: /iniciar/i })).toBeDisabled();
  });


  it('no llama onAvanzar si está loading y se hace click', () => {
    const onAvanzar = vi.fn();
    render(<TarjetaPedido pedido={BASE} onAvanzar={onAvanzar} loading />);
    fireEvent.click(screen.getByRole('button', { name: /iniciar/i }));
    expect(onAvanzar).not.toHaveBeenCalled();
  });

  // ── Badge de estado ─────────────────────────────────────
  it('muestra el badge de estado correcto', () => {
    render(<TarjetaPedido pedido={BASE} onAvanzar={vi.fn()} />);
    expect(screen.getByText(/pendiente|nuevo/i)).toBeInTheDocument();
  });
});
