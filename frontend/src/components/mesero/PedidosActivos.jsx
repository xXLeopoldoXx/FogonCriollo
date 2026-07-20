// ============================================================
//  El Fogón Criollo — PedidosActivos.jsx
//  Panel lateral con pedidos del mesero en tiempo real
// ============================================================

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Clock, QrCode, X, AlertTriangle, Unlock, ReceiptText } from 'lucide-react';
import styles from './PedidosActivos.module.css';
import { QRCodeSVG } from './QRCodeSVG';

const ESTADO_CFG = {
  PENDIENTE:  { label: 'Enviado',   cls: 'pend', step: 0 },
  EN_PROCESO: { label: 'En cocina', cls: 'proc', step: 1 },
  LISTO:      { label: 'Listo ✓',   cls: 'list', step: 2 },
  PENDIENTE_PAGO: { label: 'Pago pendiente', cls: 'pay', step: 2 },
  ENTREGADO:  { label: 'Entregado', cls: 'entr', step: 3 },
};

function PedidoCard({ pedido, onSolicitarEntrega, onMostrarQr }) {
  const cfg  = ESTADO_CFG[pedido.estado] ?? ESTADO_CFG.PENDIENTE;

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
            className={styles.qrBtn}
            onClick={() => onMostrarQr(pedido)}
            title="Mostrar código QR de seguimiento"
          >
            <QrCode size={14} /> QR cliente
          </button>
          {pedido.estado === 'LISTO' && (
            <motion.button
              className={styles.entregarBtn}
              onClick={() => onSolicitarEntrega(pedido)}
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

function ModalLiberarMesa({ pedido, pedidosPendientes, onCancelar, onConfirmar, enviando }) {
  useEffect(() => {
    const onKeyDown = event => {
      if (event.key === 'Escape' && !enviando) onCancelar();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enviando, onCancelar]);

  return (
    <motion.div
      className={styles.modalBackdrop}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={enviando ? undefined : onCancelar}
    >
      <motion.section
        className={styles.liberarModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="liberar-mesa-title"
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 20 }}
        onClick={event => event.stopPropagation()}
      >
        <div className={styles.modalIcon}><Unlock size={24} /></div>
        <h4 id="liberar-mesa-title">¿Entregar y liberar la mesa?</h4>
        <p className={styles.modalMesa}>Pedido #{pedido.id_pedido} · Mesa {pedido.numero_mesa} · Piso {pedido.piso}</p>
        <div className={styles.modalInfo}>
          <ReceiptText size={17} aria-hidden="true" />
          <span>El pedido se marcará como entregado y la mesa volverá a estar disponible.</span>
        </div>
        {pedidosPendientes.length > 0 && (
          <div className={styles.modalWarning} role="alert">
            <AlertTriangle size={17} aria-hidden="true" />
            <span>Hay {pedidosPendientes.length} pedido{pedidosPendientes.length > 1 ? 's' : ''} activo{pedidosPendientes.length > 1 ? 's' : ''} adicional{pedidosPendientes.length > 1 ? 'es' : ''} en esta mesa. No se liberará hasta que terminen.</span>
          </div>
        )}
        <div className={styles.modalActions}>
          <button className={styles.cancelBtn} onClick={onCancelar} disabled={enviando}>Cancelar</button>
          <button className={styles.confirmBtn} onClick={onConfirmar} disabled={enviando}>
            <CheckCircle size={17} /> {enviando ? 'Confirmando…' : 'Sí, entregar'}
          </button>
        </div>
      </motion.section>
    </motion.div>
  );
}

export function PedidosActivos({ pedidos = [], onEntregar, entregando = false }) {
  const [pedidoQr, setPedidoQr] = useState(null);
  const [pedidoALiberar, setPedidoALiberar] = useState(null);
  const activos = pedidos.filter(p => p.estado !== 'ENTREGADO');
  const listos  = activos.filter(p => p.estado === 'LISTO').length;
  const clienteUrl = pedidoQr ? `${window.location.origin}/cliente/${pedidoQr.id_pedido}` : '';
  const pedidosPendientes = useMemo(() => {
    if (!pedidoALiberar) return [];
    return activos.filter(p =>
      p.id_pedido !== pedidoALiberar.id_pedido
      && p.numero_mesa === pedidoALiberar.numero_mesa
      && p.piso === pedidoALiberar.piso
    );
  }, [activos, pedidoALiberar]);

  async function confirmarEntrega() {
    if (!pedidoALiberar) return;
    try {
      await onEntregar(pedidoALiberar.id_pedido);
      setPedidoALiberar(null);
    } catch {
      // La mutación ya informa el error al mesero mediante toast.
    }
  }

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
                onSolicitarEntrega={setPedidoALiberar}
                onMostrarQr={setPedidoQr}
              />
            ))
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {pedidoALiberar && (
          <ModalLiberarMesa
            pedido={pedidoALiberar}
            pedidosPendientes={pedidosPendientes}
            onCancelar={() => setPedidoALiberar(null)}
            onConfirmar={confirmarEntrega}
            enviando={entregando}
          />
        )}
        {pedidoQr && (
          <motion.div
            className={styles.qrModalBackdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPedidoQr(null)}
          >
            <motion.section
              className={styles.qrModal}
              role="dialog"
              aria-modal="true"
              aria-labelledby="qr-modal-title"
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              onClick={event => event.stopPropagation()}
            >
              <button className={styles.qrCloseBtn} onClick={() => setPedidoQr(null)} aria-label="Cerrar código QR">
                <X size={18} />
              </button>
              <QrCode size={22} className={styles.qrModalIcon} aria-hidden="true" />
              <h4 id="qr-modal-title">Seguimiento del pedido</h4>
              <p>Mesa {pedidoQr.numero_mesa}: el cliente escanea el código para consultar su pedido.</p>
              <QRCodeSVG value={clienteUrl} size={200} className={styles.qrImage} />
              <span>Pedido #{pedidoQr.id_pedido}</span>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
