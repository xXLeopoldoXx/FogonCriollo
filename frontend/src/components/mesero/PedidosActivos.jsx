// ============================================================
//  El Fogón Criollo — PedidosActivos.jsx
//  Panel lateral con pedidos del mesero en tiempo real
// ============================================================

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Link2, Check, Clock } from 'lucide-react';
import styles from './PedidosActivos.module.css';

const ESTADO_CFG = {
  PENDIENTE:  { label: 'Enviado',   cls: 'pend', step: 0 },
  EN_PROCESO: { label: 'En cocina', cls: 'proc', step: 1 },
  LISTO:      { label: 'Listo ✓',   cls: 'list', step: 2 },
  ENTREGADO:  { label: 'Entregado', cls: 'entr', step: 3 },
};

function useTiempo(fechaHora) {
  const [txt, setTxt] = useState('');
  // usamos useEffect solo si hay fechaHora
  if (fechaHora && !txt) {
    const s = Math.floor((Date.now() - new Date(fechaHora)) / 1000);
    if (s < 60) setTxt(`${s}s`);
    else if (s < 3600) setTxt(`${Math.floor(s / 60)}min`);
    else setTxt(`${Math.floor(s / 3600)}h`);
  }
  return txt;
}

function PedidoCard({ pedido, onEntregar }) {
  const [copiado, setCopiado] = useState(false);
  const cfg  = ESTADO_CFG[pedido.estado] ?? ESTADO_CFG.PENDIENTE;
  const url  = `${window.location.origin}/cliente/${pedido.id_pedido}`;

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2200);
    } catch { window.open(url, '_blank'); }
  }

  return (
    <motion.div
      className={`${styles.card} ${styles[`card_${cfg.cls}`]}`}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 20, height: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
    >
      {/* Accent bar */}
      <div className={`${styles.accentBar} ${styles[`bar_${cfg.cls}`]}`} />

      <div className={styles.cardTop}>
        <div>
          <span className={styles.pedidoId}>#{pedido.id_pedido}</span>
          <span className={styles.mesaLabel}>Mesa {pedido.numero_mesa} · P{pedido.piso}</span>
        </div>
        <div className={styles.cardRight}>
          {pedido.total > 0 && (
            <span className={styles.total}>S/ {Number(pedido.total).toFixed(2)}</span>
          )}
          <motion.span
            className={`${styles.badge} ${styles[`badge_${cfg.cls}`]}`}
            animate={cfg.cls === 'list' ? {
              boxShadow: ['0 0 0 0 rgba(76,175,80,0.4)', '0 0 0 6px rgba(76,175,80,0)', '0 0 0 0 rgba(76,175,80,0)'],
            } : {}}
            transition={{ duration: 1.8, repeat: Infinity }}
          >
            {cfg.label}
          </motion.span>
        </div>
      </div>

      {/* Barra de progreso de 4 pasos */}
      <div className={styles.progress}>
        {[0,1,2,3].map(i => (
          <div key={i} className={styles.progressStep}>
            <motion.div
              className={`${styles.progressDot}
                ${i < cfg.step  ? styles.dotDone   : ''}
                ${i === cfg.step ? styles.dotActive : ''}
                ${i > cfg.step  ? styles.dotPend   : ''}`}
              animate={i === cfg.step ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            {i < 3 && (
              <div className={`${styles.progressLine} ${i < cfg.step ? styles.lineDone : ''}`} />
            )}
          </div>
        ))}
      </div>

      {/* Acciones */}
      {pedido.estado !== 'ENTREGADO' && (
        <div className={styles.actions}>
          <button
            className={`${styles.linkBtn} ${copiado ? styles.linkBtnOk : ''}`}
            onClick={copiarLink}
            title="Copiar enlace de seguimiento"
          >
            {copiado ? <><Check size={11} /> Copiado</> : <><Link2 size={11} /> Link cliente</>}
          </button>
          {pedido.estado === 'LISTO' && (
            <motion.button
              className={styles.entregarBtn}
              onClick={() => onEntregar(pedido.id_pedido)}
              animate={{ scale: [1, 1.03, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              whileTap={{ scale: 0.95 }}
            >
              <CheckCircle size={13} />
              Entregar
            </motion.button>
          )}
        </div>
      )}
    </motion.div>
  );
}

export function PedidosActivos({ pedidos = [], onEntregar }) {
  const activos = pedidos.filter(p => p.estado !== 'ENTREGADO');
  const listos  = activos.filter(p => p.estado === 'LISTO').length;

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <h3 className={styles.title}>Mis pedidos</h3>
        <div className={styles.headerRight}>
          {listos > 0 && (
            <motion.span
              className={styles.listosAlert}
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              {listos} listo{listos > 1 ? 's' : ''}
            </motion.span>
          )}
          <span className={styles.count}>{activos.length}</span>
        </div>
      </div>

      <div className={styles.lista}>
        <AnimatePresence mode="popLayout">
          {activos.length === 0 ? (
            <motion.div
              className={styles.empty}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Clock size={28} className={styles.emptyIcon} />
              <p>Sin pedidos activos</p>
            </motion.div>
          ) : (
            activos.map(p => (
              <PedidoCard
                key={p.id_pedido}
                pedido={p}
                onEntregar={onEntregar}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
