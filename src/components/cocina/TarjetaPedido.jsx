// ============================================================
// El Fogón Criollo – TarjetaPedido Component
// Tarjeta individual de pedido en la pantalla de cocina
// ============================================================

import styles from './TarjetaPedido.module.css';

const ESTADO_CFG = {
  PENDIENTE:  { label: 'Nuevo',      accion: 'Iniciar',  cls: 'pendiente' },
  EN_PROCESO: { label: 'En proceso', accion: 'Marcar listo', cls: 'proceso' },
  LISTO:      { label: 'Listo',      accion: null,        cls: 'listo'    },
};

function tiempoTranscurrido(fechaHora) {
  const diff = Math.floor((Date.now() - new Date(fechaHora)) / 1000);
  if (diff < 60)  return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  return `${Math.floor(diff / 3600)}h`;
}

function urgencia(fechaHora) {
  const min = (Date.now() - new Date(fechaHora)) / 60000;
  if (min > 20) return 'alta';
  if (min > 10) return 'media';
  return 'normal';
}

export function TarjetaPedido({ pedido, onAvanzar }) {
  const cfg = ESTADO_CFG[pedido.estado] ?? ESTADO_CFG.PENDIENTE;
  const urg = urgencia(pedido.fecha_hora);
  const items = typeof pedido.items === 'string'
    ? JSON.parse(pedido.items)
    : (pedido.items ?? []);

  return (
    <div className={`${styles.card} ${styles[cfg.cls]} ${styles['urg_' + urg]}`}>

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.pedidoId}>#{pedido.id_pedido}</span>
          <span className={styles.mesaInfo}>
            Mesa {pedido.numero_mesa} · Piso {pedido.piso}
          </span>
        </div>
        <div className={styles.headerRight}>
          <span className={`${styles.estadoBadge} ${styles[cfg.cls]}`}>{cfg.label}</span>
          <span className={`${styles.timer} ${styles['timerUrg_' + urg]}`}>
            {tiempoTranscurrido(pedido.fecha_hora)}
          </span>
        </div>
      </div>

      {/* Mesero */}
      <p className={styles.mesero}>
        <span className={styles.meseroIcon}>👤</span> {pedido.mesero}
      </p>

      {/* Divider */}
      <div className={styles.divider} />

      {/* Items */}
      <ul className={styles.items}>
        {items.map((item, i) => (
          <li key={i} className={styles.item}>
            <span className={styles.itemCant}>{item.cantidad}×</span>
            <span className={styles.itemNombre}>{item.producto}</span>
          </li>
        ))}
      </ul>

      {/* Acción */}
      {cfg.accion && (
        <button
          className={`${styles.actionBtn} ${styles['btn_' + cfg.cls]}`}
          onClick={() => onAvanzar(pedido.id_pedido)}
        >
          {cfg.accion}
        </button>
      )}

      {/* Urgencia */}
      {urg === 'alta' && (
        <div className={styles.urgAlert}>⚠ Pedido con mucho tiempo de espera</div>
      )}
    </div>
  );
}
