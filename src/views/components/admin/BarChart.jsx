// ============================================================
// El Fogón Criollo – BarChart Component
// Gráfico de barras SVG para ventas por hora / por día
// ============================================================

import styles from './BarChart.module.css';

export function BarChart({ data = [], labelKey, valueKey, title, prefix = '' }) {
  if (!data.length) return <p className={styles.empty}>Sin datos para mostrar</p>;

  const max = Math.max(...data.map(d => d[valueKey]));

  return (
    <div className={styles.root}>
      {title && <h3 className={styles.title}>{title}</h3>}
      <div className={styles.chart}>
        {data.map((d, i) => {
          const pct = max > 0 ? (d[valueKey] / max) * 100 : 0;
          return (
            <div key={i} className={styles.col}>
              <span className={styles.barVal}>
                {prefix}{Number(d[valueKey]).toLocaleString('es-PE', { maximumFractionDigits: 0 })}
              </span>
              <div className={styles.barWrap}>
                <div
                  className={styles.bar}
                  style={{ height: `${Math.max(pct, 4)}%` }}
                />
              </div>
              <span className={styles.barLabel}>{d[labelKey]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
