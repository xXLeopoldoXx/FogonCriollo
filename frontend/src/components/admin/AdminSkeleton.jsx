// El Fogón Criollo — Skeleton de carga para el panel Admin
import styles from '../../pages/AdminPage.module.css';

function Block({ w = '100%', h = 14, r = 8, style }) {
  return <div className="fc-skel" style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

export function AdminSkeleton() {
  return (
    <div className={styles.root} aria-busy="true" aria-label="Cargando panel">
      {/* Sidebar */}
      <nav className={styles.sidebar}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '4px 2px 18px' }}>
          <Block w={26} h={26} r={8} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Block w={80} h={13} />
            <Block w={60} h={10} />
          </div>
        </div>
        {[0, 1, 2, 3].map(i => <Block key={i} h={36} r={10} style={{ marginBottom: 10 }} />)}
      </nav>

      {/* Main */}
      <main className={styles.main}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          <Block w={180} h={24} />
          <Block w={220} h={12} />
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 20 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ padding: 16, borderRadius: 14, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Block w={70} h={11} />
                <Block w={30} h={30} r={9} />
              </div>
              <Block w="60%" h={26} />
              <Block w="45%" h={10} />
            </div>
          ))}
        </div>

        {/* Charts */}
        {[0, 1].map(row => (
          <div key={row} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            {[0, 1].map(c => (
              <div key={c} style={{ padding: 18, borderRadius: 14, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <Block w={140} h={14} style={{ marginBottom: 18 }} />
                <Block h={180} r={10} />
              </div>
            ))}
          </div>
        ))}
      </main>
    </div>
  );
}
