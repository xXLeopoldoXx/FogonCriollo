// ============================================================
// El Fogón Criollo – RoleSelector Component
// Selector visual de rol: Mesero | Cocina | Admin
// ============================================================

import styles from './RoleSelector.module.css';

const ROLES = [
  { key: 'MESERO',   label: 'Mesero', icon: '🍽️' },
  { key: 'COCINERO', label: 'Cocina', icon: '👨‍🍳' },
  { key: 'ADMIN',    label: 'Admin',  icon: '📊' },
];

export function RoleSelector({ value, onChange }) {
  return (
    <div className={styles.grid}>
      {ROLES.map(({ key, label, icon }) => (
        <button
          key={key}
          type="button"
          className={`${styles.btn} ${value === key ? styles.active : ''}`}
          onClick={() => onChange(key)}
          aria-pressed={value === key}
        >
          <span className={styles.icon} aria-hidden="true">{icon}</span>
          <span className={styles.label}>{label}</span>
        </button>
      ))}
    </div>
  );
}
