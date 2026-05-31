// ============================================================
// El Fogón Criollo – MesaGrid Component
// Selector de mesas agrupadas por piso
// ============================================================

import styles from './MesaGrid.module.css';

const ESTADO_COLORS = {
  libre:    'libre',
  ocupada:  'ocupada',
};

export function MesaGrid({ mesasPorPiso, mesaActiva, onSelect }) {
  return (
    <div className={styles.root}>
      {Object.entries(mesasPorPiso).map(([piso, mesas]) => (
        <div key={piso} className={styles.piso}>
          <h3 className={styles.pisoLabel}>{piso}</h3>
          <div className={styles.grid}>
            {mesas.map(mesa => (
              <button
                key={mesa.id_mesa}
                className={`${styles.mesa} ${mesaActiva?.id_mesa === mesa.id_mesa ? styles.selected : ''}`}
                onClick={() => onSelect(mesa)}
                aria-pressed={mesaActiva?.id_mesa === mesa.id_mesa}
              >
                <span className={styles.numero}>{mesa.numero}</span>
                <span className={styles.cap}>{mesa.capacidad} pers.</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
