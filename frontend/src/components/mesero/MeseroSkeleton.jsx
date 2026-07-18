// El Fogón Criollo — Skeleton de carga para el Mesero
import styles from '../../pages/MeseroPage.module.css';

function Block({ w = '100%', h = 14, r = 8, style }) {
  return <div className="fc-skel" style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

export function MeseroSkeleton() {
  return (
    <div className={styles.root} aria-busy="true" aria-label="Cargando sistema">
      {/* Topbar */}
      <header className={styles.topbar}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Block w={22} h={22} r={7} />
          <Block w={110} h={16} />
          <Block w={130} h={30} r={20} />
        </div>
        <Block w={90} h={28} r={20} />
      </header>

      {/* Stepper */}
      <div style={{ display: 'flex', gap: 14, justifyContent: 'center', padding: '18px 0' }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <Block w={30} h={30} r={99} />
            <Block w={48} h={9} />
          </div>
        ))}
      </div>

      {/* Contenido: grid de mesas */}
      <main style={{ display: 'flex', gap: 20, padding: '8px 24px 24px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <Block w={120} h={16} style={{ marginBottom: 16 }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 12 }}>
            {Array.from({ length: 12 }).map((_, i) => <Block key={i} h={84} r={14} />)}
          </div>
        </div>
        <div style={{ width: 300, maxWidth: '100%' }}>
          <Block w={140} h={16} style={{ marginBottom: 16 }} />
          {[0, 1, 2].map(i => <Block key={i} h={72} r={12} style={{ marginBottom: 12 }} />)}
        </div>
      </main>
    </div>
  );
}
