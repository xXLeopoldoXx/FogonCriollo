// ============================================================
//  El Fogón Criollo — StepEnviado.jsx
//  Paso 4: confirmación de éxito con link para el cliente
// ============================================================

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, PlusCircle, QrCode } from 'lucide-react';
import styles from './StepEnviado.module.css';
import { QRCodeSVG } from './QRCodeSVG.jsx';

function Particle({ x, y, color, size }) {
  return (
    <motion.div
      className={styles.particle}
      style={{ left: x, top: y, width: size, height: size, background: color }}
      initial={{ y: 0, opacity: 1, scale: 1 }}
      animate={{
        y: [0, -60, -100, -80],
        x: [0, (Math.random() - 0.5) * 120],
        opacity: [1, 1, 0.6, 0],
        scale: [1, 0.8, 0.5, 0],
        rotate: [0, (Math.random() - 0.5) * 360],
      }}
      transition={{ duration: 1.8 + Math.random() * 0.8, ease: 'easeOut' }}
    />
  );
}

const COLORS = ['#C85A1A', '#F2A74B', '#4CAF50', '#5BA4F5', '#CE93D8', '#F5EDD8'];

export function StepEnviado({ idPedido, mesa, total, onNuevoPedido }) {
  const [particles, setParticles] = useState([]);
  const clienteUrl = idPedido
    ? `${window.location.origin}/cliente/${idPedido}`
    : null;

  // Generar partículas de confetti al montar
  useEffect(() => {
    const pts = Array.from({ length: 24 }, (_, i) => ({
      id:    i,
      x:     20 + Math.random() * 60 + '%',
      y:     20 + Math.random() * 30 + '%',
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size:  6 + Math.random() * 8,
    }));
    setParticles(pts);
    // Limpiar después de animación
    const t = setTimeout(() => setParticles([]), 3000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className={styles.root}>
      {/* Partículas de confetti */}
      <div className={styles.particlesWrap} aria-hidden="true">
        {particles.map(p => <Particle key={p.id} {...p} />)}
      </div>

      {/* Ícono de éxito */}
      <motion.div
        className={styles.successIcon}
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 22, delay: 0.1 }}
      >
        <motion.div
          className={styles.iconRing}
          animate={{ boxShadow: ['0 0 0 0 rgba(76,175,80,0.4)', '0 0 0 20px rgba(76,175,80,0)', '0 0 0 0 rgba(76,175,80,0)'] }}
          transition={{ duration: 2, repeat: 2, delay: 0.5 }}
        />
        <CheckCircle size={64} className={styles.checkIcon} />
      </motion.div>

      {/* Texto principal */}
      <motion.div
        className={styles.textBlock}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <h2 className={styles.title}>¡Pedido enviado!</h2>
        <p className={styles.subtitle}>
          La cocina ya recibió el pedido{' '}
          <strong className={styles.pedidoId}>#{idPedido}</strong>
        </p>
        {mesa && (
          <p className={styles.metaInfo}>
            Mesa {mesa.numero} · Piso {mesa.piso}
            {total > 0 && <> · <strong>S/ {total.toFixed(2)}</strong></>}
          </p>
        )}
      </motion.div>
      
      {/* QR para el cliente: evita copiar y compartir enlaces manualmente. */}
      {clienteUrl && (
        <motion.div
          className={styles.qrCard}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <QrCode size={20} aria-hidden="true" />
          <div className={styles.qrInfo}>
            <h3>Seguimiento para el cliente</h3>
            <p>El cliente escanea este código para ver el estado del pedido en tiempo real.</p>
          </div>
          <QRCodeSVG value={clienteUrl} size={180} className={styles.qrCode} />
          <span className={styles.qrCodeText}>Pedido #{idPedido}</span>
        </motion.div>
      )}

      {/* Acción: nuevo pedido */}
      <motion.div
        className={styles.actions}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
      >
        <motion.button
          className={styles.nuevoPedidoBtn}
          onClick={onNuevoPedido}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
        >
          <PlusCircle size={18} />
          Nuevo pedido
        </motion.button>
        <p className={styles.hint}>
          Puedes ver el estado en "Pedidos activos" →
        </p>
      </motion.div>
    </div>
  );
}
