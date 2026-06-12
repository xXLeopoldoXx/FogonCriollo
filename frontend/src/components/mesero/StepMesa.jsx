// ============================================================
//  El Fogón Criollo — StepMesa.jsx
//  Paso 1: selección de mesa con indicador de estado en vivo
// ============================================================

import { motion, AnimatePresence } from 'framer-motion';
import { Users, MapPin, ChevronRight, Clock } from 'lucide-react';
import styles from './StepMesa.module.css';

const ESTADO_MESA = {
  PENDIENTE:  { label: 'Ocupada',     cls: 'ocupadaPend', priority: 1 },
  EN_PROCESO: { label: 'En cocina',   cls: 'ocupadaProc', priority: 2 },
  LISTO:      { label: 'Listo',       cls: 'ocupadaList', priority: 3 },
};

function getMesaEstado(id_mesa, pedidos) {
  const pedidosActivos = pedidos.filter(
    p => p.id_mesa === id_mesa && p.estado !== 'ENTREGADO'
  );
  if (!pedidosActivos.length) return null;
  // Prioridad: LISTO > EN_PROCESO > PENDIENTE
  return pedidosActivos.reduce((mayor, p) => {
    const cfg = ESTADO_MESA[p.estado];
    if (!mayor || cfg.priority > ESTADO_MESA[mayor.estado]?.priority) return p;
    return mayor;
  }, null);
}

function MesaCard({ mesa, isActive, onSelect, pedidoActivo }) {
  const estaOcupada = !!pedidoActivo;
  const estadoCfg   = pedidoActivo ? ESTADO_MESA[pedidoActivo.estado] : null;

  return (
    <motion.button
      className={`
        ${styles.mesaCard}
        ${isActive    ? styles.mesaActive   : ''}
        ${estaOcupada ? styles.mesaOcupada  : styles.mesaLibre}
      `}
      onClick={() => onSelect(mesa)}
      whileHover={{ y: -3, scale: 1.02 }}
      whileTap={{ scale: 0.96 }}
      layout
      aria-pressed={isActive}
      aria-label={`Mesa ${mesa.numero}, piso ${mesa.piso}, capacidad ${mesa.capacidad}`}
    >
      {/* Indicador de estado */}
      <div className={`${styles.estadoBar} ${estadoCfg ? styles[estadoCfg.cls] : styles.libreBar}`} />

      <div className={styles.mesaNum}>{mesa.numero}</div>

      <div className={styles.mesaMeta}>
        <span className={styles.mesaCap}>
          <Users size={11} aria-hidden="true" />
          {mesa.capacidad}
        </span>
        {estadoCfg && (
          <span className={`${styles.estadoPill} ${styles[estadoCfg.cls]}`}>
            {estadoCfg.label}
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

export function StepMesa({ mesasPorPiso, mesaActiva, onSelect, pedidos = [] }) {
  const pisos = Object.entries(mesasPorPiso);
  const totalMesas = pisos.reduce((s, [, ms]) => s + ms.length, 0);
  const mesasOcupadas = pisos.reduce((s, [, ms]) =>
    s + ms.filter(m => pedidos.some(p => p.id_mesa === m.id_mesa && p.estado !== 'ENTREGADO')).length, 0
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
                  const pedidoActivo = getMesaEstado(mesa.id_mesa, pedidos);
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
                      />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </motion.section>
        ))}
      </div>

      {/* CTA cuando hay mesa seleccionada */}
      <AnimatePresence>
        {mesaActiva && (
          <motion.div
            className={styles.ctaBar}
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            <div className={styles.ctaInfo}>
              <span className={styles.ctaMesa}>Mesa {mesaActiva.numero}</span>
              <span className={styles.ctaSub}>
                Piso {mesaActiva.piso} · {mesaActiva.capacidad} personas
              </span>
            </div>
            <motion.button
              className={styles.ctaBtn}
              onClick={() => onSelect(mesaActiva)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              Ir a la carta
              <ChevronRight size={18} />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
