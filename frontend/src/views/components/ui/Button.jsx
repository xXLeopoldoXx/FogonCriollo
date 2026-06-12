// ============================================================
// El Fogón Criollo – Button Component
// Botón reutilizable con estado loading y variantes
// ============================================================

import styles from './Button.module.css';

export function Button({ children, loading, variant = 'primary', className = '', ...props }) {
  return (
    <button
      className={`${styles.btn} ${styles[variant]} ${loading ? styles.loading : ''} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      <span className={styles.text}>{children}</span>
      {loading && (
        <span className={styles.spinner} aria-label="Cargando">
          <span className={styles.ring} />
        </span>
      )}
    </button>
  );
}
