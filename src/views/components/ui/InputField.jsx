// ============================================================
// El Fogón Criollo – InputField Component
// Input reutilizable con ícono y estado de error
// ============================================================

import styles from './InputField.module.css';

export function InputField({ label, id, icon: Icon, error, ...props }) {
  return (
    <div className={styles.field}>
      {label && <label htmlFor={id} className={styles.label}>{label}</label>}
      <div className={styles.wrap}>
        <input id={id} className={`${styles.input} ${error ? styles.hasError : ''}`} {...props} />
        {Icon && <Icon className={styles.icon} aria-hidden="true" />}
      </div>
    </div>
  );
}
