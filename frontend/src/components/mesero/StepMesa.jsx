// ============================================================
//  El Fogón Criollo — StepMesa.jsx
//  Paso 1: selección de mesa con indicador de estado en vivo
// ============================================================

import { motion, AnimatePresence } from 'framer-motion';
import { Users, MapPin, LockKeyhole } from 'lucide-react';
import styles from './StepMesa.module.css';

const ESTADO_MESA = {
  PENDIENTE:  { label: 'Ocupada',     cls: 'ocupadaPend', priority: 1 },
  EN_PROCESO: { label: 'En cocina',   cls: 'ocupadaProc', priority: 2 },
  LISTO:      { label: 'Listo',       cls: 'ocupadaList', priority: 3 },
  PENDIENTE_PAGO: { label: 'Pago pendiente', cls: 'pendientePago', priority: 4 },
};

function estaReservada(mesa) {
  const estado = String(mesa.estado ?? mesa.estado_mesa ?? '').toUpperCase();
  return mesa.reservada === true || mesa.es_reservada === true || ['RESERVADA', 'RESERVED'].includes(estado);
}

function getMesaEstado(pedidos) {
  const pedidosActivos = pedidos.filter(
    p => p.estado !== 'ENTREGADO'
  );
  if (!pedidosActivos.length) return null;
  // Prioridad: LISTO > EN_PROCESO > PENDIENTE
  return pedidosActivos.reduce((mayor, p) => {
    const cfg = ESTADO_MESA[p.estado] ?? ESTADO_MESA.PENDIENTE;
    if (!mayor || cfg.priority > ESTADO_MESA[mayor.estado]?.priority) return p;
    return mayor;
  }, null);
}

function MesaCard({ mesa, isActive, onSelect, pedidoActivo, validando }) {
  const estaOcupada = !!pedidoActivo;
  const reservada = estaReservada(mesa);
  const estadoCfg   = pedidoActivo ? ESTADO_MESA[pedidoActivo.estado] : null;
  const bloqueada = estaOcupada || reservada || validando;

  return (
    <motion.button
      className={`
        ${styles.mesaCard}
        ${isActive    ? styles.mesaActive   : ''}
        ${bloqueada ? styles.mesaOcupada  : styles.mesaLibre}
      `}
      onClick={() => onSelect(mesa)}
      whileHover={bloqueada ? undefined : { y: -3, scale: 1.02 }}
      whileTap={bloqueada ? undefined : { scale: 0.96 }}
      layout
      disabled={bloqueada}
      aria-pressed={isActive}
      aria-label={`Mesa ${mesa.numero}, piso ${mesa.piso}, ${validando ? 'validando disponibilidad' : reservada ? 'reservada' : estaOcupada ? `ocupada, ${estadoCfg?.label}` : 'libre'}, capacidad ${mesa.capacidad}`}
    >
      {/* Indicador de estado */}
      <div className={`${styles.estadoBar} ${reservada ? styles.reservada : estadoCfg ? styles[estadoCfg.cls] : styles.libreBar}`} />

      <div className={styles.mesaNum}>{mesa.numero}</div>

      <div className={styles.mesaMeta}>
        <span className={styles.mesaCap}>
          <Users size={11} aria-hidden="true" />
          {mesa.capacidad}
        </span>
        {(estadoCfg || reservada || validando) && (
          <span className={`${styles.estadoPill} ${validando ? styles.validando : reservada ? styles.reservada : styles[estadoCfg.cls]}`}>
            {reservada && <LockKeyhole size={10} aria-hidden="true" />}
            {validando ? 'Validando' : reservada ? 'Reservada' : estadoCfg.label}
          </span>
        )}
      </div>

      {isActive && (
        <motion.div
          className={styles.selectedCheck}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 600, damping: 20 }}
        >
          ✓
        </motion.div>
      )}
    </motion.button>
  );
}

export function StepMesa({ mesasPorPiso, pedidosPorMesa = {}, mesaActiva, onSelect }) {
  const pisos = Object.entries(mesasPorPiso);
  const totalMesas = pisos.reduce((s, [, ms]) => s + ms.length, 0);
  const mesasOcupadas = pisos.reduce((s, [, ms]) =>
    s + ms.filter(m => (pedidosPorMesa[m.id_mesa] ?? []).some(p => p.estado !== 'ENTREGADO') || estaReservada(m)).length, 0
  );

  return (
    <div className={styles.root}>
      {/* Hero header del paso */}
      <motion.div
        className={styles.header}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className={styles.headerIcon}>
          <MapPin size={28} />
        </div>
        <div>
          <h1 className={styles.title}>Seleccionar Mesa</h1>
          <p className={styles.subtitle}>
            {mesasOcupadas} de {totalMesas} mesas activas
          </p>
        </div>

        <div className={styles.leyenda}>
          <span className={styles.leyendaItem}>
            <span className={`${styles.leyendaDot} ${styles.dotLibre}`} /> Libre
          </span>
          <span className={styles.leyendaItem}>
            <span className={`${styles.leyendaDot} ${styles.dotOcupada}`} /> Ocupada
          </span>
          <span className={styles.leyendaItem}>
            <span className={`${styles.leyendaDot} ${styles.dotReservada}`} /> Reservada
          </span>
          <span className={styles.leyendaItem}>
            <span className={`${styles.leyendaDot} ${styles.dotPago}`} /> Pago pendiente
          </span>
          <span className={styles.leyendaItem}>
            <span className={`${styles.leyendaDot} ${styles.dotListo}`} /> Listo
          </span>
        </div>
      </motion.div>

      {/* Grid de mesas por piso */}
      <div className={styles.pisos}>
        {pisos.map(([piso, mesas], pisoIdx) => (
          <motion.section
            key={piso}
            className={styles.pisoSection}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: pisoIdx * 0.08 }}
          >
            <div className={styles.pisoHeader}>
              <h2 className={styles.pisoLabel}>{piso}</h2>
              <span className={styles.pisoCont}>{mesas.length} mesas</span>
            </div>

            <div className={styles.mesasGrid}>
              <AnimatePresence>
                {mesas.map((mesa, i) => {
                  const pedidoActivo = getMesaEstado(pedidosPorMesa[mesa.id_mesa] ?? []);
                  return (
                    <motion.div
                      key={mesa.id_mesa}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: pisoIdx * 0.05 + i * 0.03 }}
                    >
                      <MesaCard
                        mesa={mesa}
                        isActive={mesaActiva?.id_mesa === mesa.id_mesa}
                        onSelect={onSelect}
                        pedidoActivo={pedidoActivo}
                        validando={!Array.isArray(pedidosPorMesa[mesa.id_mesa])}
                      />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </motion.section>
        ))}
      </div>

    </div>
  );
}
