// El Fogón Criollo — Skeleton de carga para la Cocina
import styles from '../../pages/CocinaPage.module.css';

const COLS = ['colPendiente', 'colProceso', 'colListo'];

function SkelCard() {
  return (
    <div style={{ padding: 14, borderRadius: 14, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div className="fc-skel" style={{ width: 70, height: 16 }} />
        <div className="fc-skel" style={{ width: 54, height: 16 }} />
      </div>
      <div className="fc-skel" style={{ width: '55%', height: 12 }} />
      <div className="fc-skel" style={{ width: '100%', height: 34 }} />
      <div className="fc-skel" style={{ width: '100%', height: 34 }} />
      <div className="fc-skel" style={{ width: '100%', height: 40, marginTop: 4 }} />
    </div>
  );
}

export function CocinaSkeleton() {
  return (
    <div className={styles.root} aria-busy="true" aria-label="Cargando pedidos">
      <header className={styles.topbar}>
        <div className={styles.topLeft}>
          <div className="fc-skel" style={{ width: 26, height: 26, borderRadius: 8 }} />
          <div className="fc-skel" style={{ width: 160, height: 16 }} />
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {[0, 1, 2].map(i => <div key={i} className="fc-skel" style={{ width: 60, height: 40, borderRadius: 10 }} />)}
        </div>
        <div className="fc-skel" style={{ width: 90, height: 28, borderRadius: 8 }} />
      </header>
      <main className={styles.kanban}>
        {COLS.map((cls, c) => (
          <div key={cls} className={styles.col}>
            <div className={`${styles.colHeader} ${styles[cls]}`}>
              <div className="fc-skel" style={{ width: 120, height: 12 }} />
              <div className="fc-skel" style={{ width: 24, height: 20 }} />
            </div>
            <div className={styles.colCards}>
              {Array.from({ length: 3 - c }).map((_, i) => <SkelCard key={i} />)}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
