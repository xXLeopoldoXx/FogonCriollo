// ============================================================
// El Fogón Criollo – KpiCard Component
// Tarjeta de métrica para el dashboard del admin
// ============================================================

import styles from './KpiCard.module.css';

export function KpiCard({ label, value, sub, accent, icon }) {
  return (
    <div className={`${styles.card} ${accent ? styles[accent] : ''}`}>
      <div className={styles.top}>
        <span className={styles.label}>{label}</span>
        {icon && <span className={styles.icon} aria-hidden="true">{icon}</span>}
      </div>
      <span className={styles.value}>{value}</span>
      {sub && <span className={styles.sub}>{sub}</span>}
    </div>
  );
}
