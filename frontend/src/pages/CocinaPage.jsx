// El Fogón Criollo — CocinaPage v2
import { Flame, Inbox, ChefHat, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { useAuthStore }        from '../stores/authStore';
import { useCocina }           from '../hooks/useCocina';
import { TarjetaPedido }       from '../components/cocina/TarjetaPedido';
import { ContadorEstados }     from '../components/cocina/ContadorEstados';
import styles                  from './CocinaPage.module.css';

export function CocinaPage() {
  const { user, signOut }   = useAuthStore();
  const { pedidos, nuevosIds, alertaPedido, contadores, avanzarEstado, loading, error, connected } = useCocina();

  if (loading) return (
    <div className={styles.loadingScreen}>
      <motion.div animate={{ filter:['drop-shadow(0 0 8px rgba(232,131,74,0.5))','drop-shadow(0 0 24px rgba(232,131,74,1))','drop-shadow(0 0 8px rgba(232,131,74,0.5))'] }} transition={{ duration:1.5, repeat:Infinity }}>
        <Flame size={52} color="#E8834A" />
      </motion.div>
      <p className={styles.loadText}>Cargando pedidos...</p>
    </div>
  );

  const porEstado = (e) => pedidos.filter(p => p.estado === e);

  return (
    <div className={styles.root}>
      <Toaster position="top-right" toastOptions={{ style:{ background:'#2A190C', color:'#F5EDD8', border:'1px solid rgba(200,90,26,0.4)' }}} />
      <header className={styles.topbar}>
        <div className={styles.topLeft}>
          <motion.span className={styles.logo} animate={{ filter:['drop-shadow(0 0 6px rgba(232,131,74,0.5))','drop-shadow(0 0 16px rgba(232,131,74,1))','drop-shadow(0 0 6px rgba(232,131,74,0.5))'] }} transition={{ duration:2.5, repeat:Infinity }}>
            <Flame size={24} />
          </motion.span>
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

      <AnimatePresence>
        {alertaPedido && (
          <motion.div className={styles.incomingAlert} role="status" aria-live="polite"
            initial={{ x: 40, opacity:0 }} animate={{ x:0, opacity:1 }} exit={{ x:40, opacity:0 }}>
            <span className={styles.incomingPulse} />
            <div>
              <strong>Pedido nuevo #{alertaPedido.id_pedido}</strong>
              <small>Mesa {alertaPedido.numero_mesa} · Piso {alertaPedido.piso}</small>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className={styles.kanban}>
        {[
          { estado:'PENDIENTE',  titulo:'Nuevos',              cls:'colPendiente', Icon:Inbox },
          { estado:'EN_PROCESO', titulo:'En preparación',      cls:'colProceso',   Icon:ChefHat },
          { estado:'LISTO',      titulo:'Listos para entregar', cls:'colListo',    Icon:Bell },
        ].map(({ estado, titulo, cls, Icon }) => (
          <div key={estado} className={styles.col}>
            <div className={`${styles.colHeader} ${styles[cls]}`}>
              <span className={styles.colTitle}>{titulo}</span>
              <span className={styles.colCount}>{contadores[{PENDIENTE:'pendiente',EN_PROCESO:'en_proceso',LISTO:'listo'}[estado]]}</span>
            </div>
            <div className={styles.colCards}>
              {porEstado(estado).length === 0
                ? <p className={styles.colEmpty}><Icon size={16} /> Sin pedidos</p>
                : porEstado(estado).map(p => (
                    <TarjetaPedido key={p.id_pedido} pedido={p} onAvanzar={avanzarEstado} isNuevo={nuevosIds.has(p.id_pedido)} />
                  ))
              }
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
