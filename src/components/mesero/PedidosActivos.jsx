// ============================================================
// El Fogón Criollo – PedidosActivos Component
// Lista en vivo de pedidos del mesero con sus estados
// ============================================================

import styles from './PedidosActivos.module.css';

const ESTADO_CONFIG = {
  PENDIENTE:  { label: 'Pendiente',   cls: 'pendiente' },
  EN_PROCESO: { label: 'En cocina',   cls: 'proceso'   },
  LISTO:      { label: 'Listo ✓',     cls: 'listo'     },
  ENTREGADO:  { label: 'Entregado',   cls: 'entregado' },
};

export function PedidosActivos({ pedidos }) {
  const activos = pedidos.filter(p => p.estado !== 'ENTREGADO');

  if (activos.length === 0) {
    return <p className={styles.empty}>Sin pedidos activos en este momento.</p>;
  }

  return (
    <div className={styles.list}>
      {activos.map(p => {
        const cfg = ESTADO_CONFIG[p.estado] ?? { label: p.estado, cls: 'pendiente' };
        return (
          <div key={p.id_pedido} className={styles.item}>
            <div className={styles.itemLeft}>
              <span className={styles.pedidoId}>#{p.id_pedido}</span>
              <span className={styles.mesaInfo}>Mesa {p.numero_mesa} · Piso {p.piso}</span>
            </div>
            <div className={styles.itemRight}>
              <span className={styles.total}>S/ {Number(p.total).toFixed(2)}</span>
              <span className={`${styles.badge} ${styles[cfg.cls]}`}>{cfg.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
