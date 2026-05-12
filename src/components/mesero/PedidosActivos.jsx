
// El Fogón Criollo – PedidosActivos Component
// Lista en vivo de pedidos del mesero con sus estados

import { useState } from 'react';
import styles from './PedidosActivos.module.css';

/* Orden de los estados como pasos (0-3) */
const PASO = { PENDIENTE: 0, EN_PROCESO: 1, LISTO: 2, ENTREGADO: 3 };

const ESTADO_CFG = {
  PENDIENTE:  { label: 'Enviado',     color: 'pendiente' },
  EN_PROCESO: { label: 'En cocina',   color: 'proceso'   },
  LISTO:      { label: 'Listo ✓',     color: 'listo'     },
  ENTREGADO:  { label: 'Entregado',   color: 'entregado' },
};

/* Íconos de cada paso */
const PASO_ICONS = ['📋', '🔥', '✅', '🍽️'];

function getClienteURL(idPedido) {
  return `${window.location.origin}/cliente/${idPedido}`;
}

function PedidoItem({ pedido }) {
  const [copiado, setCopiado] = useState(false);
  const cfg    = ESTADO_CFG[pedido.estado] ?? { label: pedido.estado, color: 'pendiente' };
  const paso   = PASO[pedido.estado] ?? 0;

  async function compartir() {
    try {
      await navigator.clipboard.writeText(getClienteURL(pedido.id_pedido));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2200);
    } catch {
      window.open(getClienteURL(pedido.id_pedido), '_blank');
    }
  }

  return (
    <div className={`${styles.item} ${styles[`item_${cfg.color}`]}`}>

      {/* ── Fila superior ──────────────────────── */}
      <div className={styles.itemTop}>
        <div className={styles.itemLeft}>
          <span className={styles.pedidoId}>#{pedido.id_pedido}</span>
          <span className={styles.mesaInfo}>
            Mesa {pedido.numero_mesa} · P{pedido.piso}
          </span>
        </div>
        <div className={styles.itemRight}>
          <span className={styles.total}>S/ {Number(pedido.total).toFixed(2)}</span>
          <span className={`${styles.badge} ${styles[cfg.color]}`}>{cfg.label}</span>
        </div>
      </div>

      {/* ── Barra de progreso de 4 pasos ───────── */}
      <div className={styles.progress} aria-label={`Estado: ${cfg.label}`}>
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className={[
              styles.progressStep,
              i < paso  ? styles.progressDone    : '',
              i === paso ? styles.progressActive  : '',
              i > paso  ? styles.progressPending : '',
            ].filter(Boolean).join(' ')}
          >
            <span className={styles.progressIcon}>{PASO_ICONS[i]}</span>
            {i < 3 && <div className={`${styles.progressLine} ${i < paso ? styles.progressLineDone : ''}`} />}
          </div>
        ))}
      </div>

      {/* ── Botón compartir link ────────────────── */}
      {pedido.estado !== 'ENTREGADO' && (
        <button
          className={`${styles.shareBtn} ${copiado ? styles.shareBtnOk : ''}`}
          onClick={compartir}
          title="Copiar link de seguimiento para el cliente"
        >
          {copiado ? '✓ Link copiado' : '🔗 Link al cliente'}
        </button>
      )}
    </div>
  );
}

export function PedidosActivos({ pedidos }) {
  const activos = pedidos.filter(p => p.estado !== 'ENTREGADO');

  if (activos.length === 0) {
    return (
      <div className={styles.empty}>
        <span>🍃</span>
        <p>Sin pedidos activos</p>
      </div>
    );
  }

  return (
    <div className={styles.list}>
      {activos.map(p => (
        <PedidoItem key={p.id_pedido} pedido={p} />
      ))}
    </div>
  );
}
