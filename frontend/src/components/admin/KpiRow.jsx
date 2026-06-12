// ============================================================
//  El Fogón Criollo — KpiRow.jsx
//  Fila de KPIs con animaciones de contador y tendencias
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign, CheckCircle2, Clock, Bell,
  TrendingUp, Table2,
} from 'lucide-react';
import styles from './KpiRow.module.css';

// ── Contador animado ─────────────────────────────────────
function AnimatedNumber({ value, prefix = '', suffix = '', decimals = 0 }) {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    const start  = prevRef.current;
    const end    = Number(value) || 0;
    prevRef.current = end;
    if (start === end) return;

    const duration = 800;
    const startTime = performance.now();

    function update(now) {
      const elapsed  = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(start + (end - start) * eased);
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  }, [value]);

  const formatted = decimals > 0
    ? display.toFixed(decimals)
    : Math.round(display).toLocaleString('es-PE');

  return <>{prefix}{formatted}{suffix}</>;
}

const KPI_CONFIGS = [
  {
    key:     'ingresos_hoy',
    label:   'Ingresos hoy',
    sub:     'pedidos entregados',
    accent:  'brand',
    Icon:    DollarSign,
    format:  (v) => ({ prefix: 'S/ ', value: v, decimals: 2 }),
  },
  {
    key:     'pedidos_entregados',
    label:   'Entregados',
    sub:     'hoy',
    accent:  'green',
    Icon:    CheckCircle2,
    format:  (v) => ({ value: v }),
  },
  {
    key:     '_en_proceso_calc',
    label:   'En proceso',
    sub:     'pendientes + cocina',
    accent:  'blue',
    Icon:    Clock,
    format:  (_, r) => ({ value: (Number(r?.pedidos_pendientes) || 0) + (Number(r?.pedidos_en_proceso) || 0) }),
  },
  {
    key:     'pedidos_listos',
    label:   'Listos',
    sub:     'esperan al mesero',
    accent:  'amber',
    Icon:    Bell,
    format:  (v) => ({ value: v }),
  },
  {
    key:     'mesas_activas',
    label:   'Mesas activas',
    sub:     'con pedidos abiertos',
    accent:  'teal',
    Icon:    Table2,
    format:  (v) => ({ value: v }),
  },
  {
    key:     'tiempo_promedio_min',
    label:   'Tiempo prom.',
    sub:     'min por pedido',
    accent:  'purple',
    Icon:    TrendingUp,
    format:  (v) => ({ value: v ?? 0, suffix: ' min' }),
  },
];

function KpiCard({ config, resumen }) {
  const { label, sub, accent, Icon, format } = config;
  const raw = resumen?.[config.key];
  const { prefix = '', value, suffix = '', decimals = 0 } = format(raw, resumen);

  return (
    <motion.div
      className={`${styles.card} ${styles[accent]}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3, transition: { duration: 0.15 } }}
      layout
    >
      <div className={styles.accentBar} />
      <div className={styles.cardTop}>
        <span className={styles.cardLabel}>{label}</span>
        <div className={`${styles.iconWrap} ${styles[`icon_${accent}`]}`}>
          <Icon size={17} aria-hidden="true" />
        </div>
      </div>
      <div className={styles.cardValue}>
        <AnimatedNumber
          value={value}
          prefix={prefix}
          suffix={suffix}
          decimals={decimals}
        />
      </div>
      <p className={styles.cardSub}>{sub}</p>
    </motion.div>
  );
}

export function KpiRow({ resumen }) {
  return (
    <div className={styles.row}>
      {KPI_CONFIGS.map((cfg, i) => (
        <motion.div
          key={cfg.key}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
        >
          <KpiCard config={cfg} resumen={resumen} />
        </motion.div>
      ))}
    </div>
  );
}
