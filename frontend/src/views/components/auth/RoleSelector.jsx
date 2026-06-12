// ============================================================
// El Fogón Criollo – RoleSelector Component
// Selector visual de rol: Mesero | Cocina | Admin
// ============================================================

import { UtensilsCrossed, ChefHat, LayoutDashboard } from 'lucide-react';
import styles from './RoleSelector.module.css';

const ROLES = [
  { key: 'MESERO',        label: 'Mesero',  icon: UtensilsCrossed },
  { key: 'COCINA',        label: 'Cocina',  icon: ChefHat },
  { key: 'ADMINISTRADOR', label: 'Admin',   icon: LayoutDashboard },
];

export function RoleSelector({ value, onChange }) {
  return (
    <div className={styles.grid}>
      {ROLES.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          className={`${styles.btn} ${value === key ? styles.active : ''}`}
          onClick={() => onChange(key)}
          aria-pressed={value === key}
        >
          <Icon size={28} className={styles.icon} aria-hidden="true" />
          <span className={styles.label}>{label}</span>
        </button>
      ))}
    </div>
  );
}
