// ============================================================
// El Fogón Criollo – CocinaPage
// Panel de cocina — vista de pedidos en tiempo real
// ============================================================

import { useAuth }           from '../context/AuthContext';
import { useCocina }         from '../hooks/useCocina';
import { TarjetaPedido }     from '../components/cocina/TarjetaPedido';
import { ContadorEstados }   from '../components/cocina/ContadorEstados';
import styles                from './CocinaPage.module.css';

export function CocinaPage() {
  const { user, signOut } = useAuth();
  const { pedidos, contadores, avanzarEstado, loading, error, connected } = useCocina();

  if (loading) {
    return (
      <div className={styles.loadingScreen}>
        <span className={styles.loadFlame}>🔥</span>
        <p className={styles.loadText}>Cargando pedidos...</p>
      </div>
    );
  }

  return (
    <div className={styles.root}>

      {/* Topbar */}
      <header className={styles.topbar}>
        <div className={styles.topLeft}>
          <span className={styles.logo}>🔥</span>
          <div>
            <span className={styles.brandName}>El Fogón Criollo</span>
            <span className={styles.panel}> · Cocina</span>
          </div>
        </div>

        <ContadorEstados contadores={contadores} />

        <div className={styles.topRight}>
          <span className={`${styles.connDot} ${connected ? styles.online : styles.offline}`} />
          <span className={styles.connLabel}>{connected ? 'En línea' : 'Sin conexión'}</span>
          <button className={styles.logoutBtn} onClick={signOut}>Salir</button>
        </div>
      </header>

      {error && <div className={styles.errorBanner} role="alert">{error}</div>}

      {/* Columnas Kanban */}
      <main className={styles.kanban}>

        {/* Columna PENDIENTE */}
        <div className={styles.col}>
          <div className={`${styles.colHeader} ${styles.colPendiente}`}>
            <span className={styles.colTitle}>Nuevos</span>
            <span className={styles.colCount}>{contadores.pendiente}</span>
          </div>
          <div className={styles.colCards}>
            {pedidos.filter(p => p.estado === 'PENDIENTE').length === 0
              ? <p className={styles.colEmpty}>Sin pedidos nuevos</p>
              : pedidos
                  .filter(p => p.estado === 'PENDIENTE')
                  .map(p => (
                    <TarjetaPedido key={p.id_pedido} pedido={p} onAvanzar={avanzarEstado} />
                  ))
            }
          </div>
        </div>

        {/* Columna EN_PROCESO */}
        <div className={styles.col}>
          <div className={`${styles.colHeader} ${styles.colProceso}`}>
            <span className={styles.colTitle}>En preparación</span>
            <span className={styles.colCount}>{contadores.en_proceso}</span>
          </div>
          <div className={styles.colCards}>
            {pedidos.filter(p => p.estado === 'EN_PROCESO').length === 0
              ? <p className={styles.colEmpty}>Nada en preparación</p>
              : pedidos
                  .filter(p => p.estado === 'EN_PROCESO')
                  .map(p => (
                    <TarjetaPedido key={p.id_pedido} pedido={p} onAvanzar={avanzarEstado} />
                  ))
            }
          </div>
        </div>

        {/* Columna LISTO */}
        <div className={styles.col}>
          <div className={`${styles.colHeader} ${styles.colListo}`}>
            <span className={styles.colTitle}>Listos para entregar</span>
            <span className={styles.colCount}>{contadores.listo}</span>
          </div>
          <div className={styles.colCards}>
            {pedidos.filter(p => p.estado === 'LISTO').length === 0
              ? <p className={styles.colEmpty}>Sin pedidos listos</p>
              : pedidos
                  .filter(p => p.estado === 'LISTO')
                  .map(p => (
                    <TarjetaPedido key={p.id_pedido} pedido={p} onAvanzar={avanzarEstado} />
                  ))
            }
          </div>
        </div>

      </main>
    </div>
  );
}
