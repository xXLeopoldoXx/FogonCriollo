import { TarjetaPedido } from './TarjetaPedido.jsx';
import { ESTADOS } from '../../models/pedidoStateMachine.js';

const COLUMNAS = [
  { estado: ESTADOS.PENDIENTE,  titulo: 'Nuevos'          },
  { estado: ESTADOS.EN_PROCESO, titulo: 'En preparación'  },
  { estado: ESTADOS.LISTO,      titulo: 'Listos'          },
];

/**
 * @param {{
 *   pedidos:    Array<object>,
 *   onAvanzar:  (id: number, nuevoEstado: string) => void,
 *   loading?:   Record<number, boolean>,
 * }} props
 */
export function PanelCocina({ pedidos = [], onAvanzar, loading = {} }) {
  return (
    <main style={{ display: 'flex', gap: 16 }}>
      {COLUMNAS.map(({ estado, titulo }) => {
        const col = pedidos.filter(p => p.estado === estado);
        return (
          <section key={estado} data-testid={`col-${estado}`}>
            <header>
              <h2>{titulo}</h2>
              <span data-testid="contador">{col.length}</span>
            </header>

            {col.length === 0 && (
              <p>Sin pedidos</p>
            )}

            {col.map(pedido => (
              <TarjetaPedido
                key={pedido.id_pedido}
                pedido={pedido}
                onAvanzar={onAvanzar}
                loading={!!loading[pedido.id_pedido]}
              />
            ))}
          </section>
        );
      })}
    </main>
  );
}
