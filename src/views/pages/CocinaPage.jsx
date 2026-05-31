// El Fogón Criollo – CocinaPage
// Panel de cocina — vista de pedidos en tiempo real

import { Flame, Inbox, ChefHat, Bell } from 'lucide-react';
import { useAuth }         from '../../context/AuthContext';
import { useCocina }       from '../../controllers/useCocina';
import { TarjetaPedido }   from '../components/cocina/TarjetaPedido';
import { ContadorEstados } from '../components/cocina/ContadorEstados';
import styles              from './CocinaPage.module.css';

export function CocinaPage() {
  const { user, signOut } = useAuth();
  const { pedidos, nuevosIds, alertaPedido, contadores, avanzarEstado, loading, error, connected } = useCocina();

  if (loading) {
    return (
      <div className={styles.loadingScreen}>
        <span className={styles.loadFlame}><Flame size={48} /></span>
        <p className={styles.loadText}>Cargando pedidos...</p>
      </div>
    );
  }

  const porEstado = (estado) => pedidos.filter(p => p.estado === estado);

  return (
    <div className={styles.root}>

      {/* ── Topbar ────────────────────────────────── */}
      <header className={styles.topbar}>
        <div className={styles.topLeft}>
          <span className={styles.logo}><Flame size={24} /></span>
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

      {error && (
        <div className={styles.errorBanner} role="alert">{error}</div>
      )}

      {alertaPedido && (
        <div className={styles.incomingAlert} role="status" aria-live="polite">
          <span className={styles.incomingPulse} />
          <div>
            <strong>Pedido nuevo #{alertaPedido.id_pedido}</strong>
            <small>Mesa {alertaPedido.numero_mesa} · Piso {alertaPedido.piso}</small>
          </div>
        </div>
      )}

      {/* ── Kanban ────────────────────────────────── */}
      <main className={styles.kanban}>

        {/* PENDIENTE */}
        <div className={styles.col}>
          <div className={`${styles.colHeader} ${styles.colPendiente}`}>
            <span className={styles.colTitle}>Nuevos</span>
            <span className={`${styles.colCount} ${contadores.pendiente > 0 ? styles.colCountActive : ''}`}>
              {contadores.pendiente}
            </span>
          </div>
          <div className={styles.colCards}>
            {porEstado('PENDIENTE').length === 0
              ? <p className={styles.colEmpty}><Inbox size={16} /> Sin pedidos nuevos</p>
              : porEstado('PENDIENTE').map(p => (
                  <TarjetaPedido
                    key={p.id_pedido}
                    pedido={p}
                    onAvanzar={avanzarEstado}
                    isNuevo={nuevosIds.has(p.id_pedido)}
                  />
                ))
            }
          </div>
        </div>

        {/* EN_PROCESO */}
        <div className={styles.col}>
          <div className={`${styles.colHeader} ${styles.colProceso}`}>
            <span className={styles.colTitle}>En preparación</span>
            <span className={styles.colCount}>{contadores.en_proceso}</span>
          </div>
          <div className={styles.colCards}>
            {porEstado('EN_PROCESO').length === 0
              ? <p className={styles.colEmpty}><ChefHat size={16} /> Nada en preparación</p>
              : porEstado('EN_PROCESO').map(p => (
                  <TarjetaPedido
                    key={p.id_pedido}
                    pedido={p}
                    onAvanzar={avanzarEstado}
                    isNuevo={false}
                  />
                ))
            }
          </div>
        </div>

        {/* LISTO */}
        <div className={styles.col}>
          <div className={`${styles.colHeader} ${styles.colListo}`}>
            <span className={styles.colTitle}>Listos para entregar</span>
            <span className={`${styles.colCount} ${contadores.listo > 0 ? styles.colCountListo : ''}`}>
              {contadores.listo}
            </span>
          </div>
          <div className={styles.colCards}>
            {porEstado('LISTO').length === 0
              ? <p className={styles.colEmpty}><Bell size={16} /> Sin pedidos listos</p>
              : porEstado('LISTO').map(p => (
                  <TarjetaPedido
                    key={p.id_pedido}
                    pedido={p}
                    onAvanzar={avanzarEstado}
                    isNuevo={false}
                  />
                ))
            }
          </div>
        </div>

      </main>
    </div>
  );
}
