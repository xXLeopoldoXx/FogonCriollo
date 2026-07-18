// El Fogón Criollo — CocinaPage v3 (drag & drop)
import { useEffect } from 'react';
import { Flame, Inbox, ChefHat, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import {
  DndContext, PointerSensor, useSensor, useSensors,
  useDraggable, useDroppable, closestCorners,
} from '@dnd-kit/core';
import { useAuthStore }        from '../stores/authStore';
import { useCocina }           from '../hooks/useCocina';
import { puedeTransicionar }   from '../models/pedidoStateMachine';
import { TarjetaPedido }       from '../components/cocina/TarjetaPedido';
import { ContadorEstados }     from '../components/cocina/ContadorEstados';
import { CocinaSkeleton }      from '../components/cocina/CocinaSkeleton';
import styles                  from './CocinaPage.module.css';

const COLUMNAS = [
  { estado:'PENDIENTE',  titulo:'Nuevos',               cls:'colPendiente', Icon:Inbox,   countKey:'pendiente'  },
  { estado:'EN_PROCESO', titulo:'En preparación',       cls:'colProceso',   Icon:ChefHat, countKey:'en_proceso' },
  { estado:'LISTO',      titulo:'Listos para entregar',  cls:'colListo',    Icon:Bell,    countKey:'listo'      },
];

// ── Tarjeta arrastrable ──────────────────────────────────
function DraggableCard({ pedido, children }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: String(pedido.id_pedido),
    data: { estado: pedido.estado },
  });
  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    zIndex: isDragging ? 60 : undefined,
    opacity: isDragging ? 0.9 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
    touchAction: 'none',
  };
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {children}
    </div>
  );
}

// ── Columna soltable ─────────────────────────────────────
function DroppableColumn({ estado, children }) {
  const { setNodeRef, isOver } = useDroppable({ id: estado });
  return (
    <div ref={setNodeRef} className={`${styles.colCards} ${isOver ? styles.colOver : ''}`}>
      {children}
    </div>
  );
}

export function CocinaPage() {
  const { user, signOut }   = useAuthStore();
  const { pedidos, nuevosIds, alertaPedido, contadores, avanzarEstado, loading, error, connected } = useCocina();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Toast al llegar un pedido nuevo (complementa el sonido y la alerta lateral)
  useEffect(() => {
    if (!alertaPedido) return;
    toast.success(`Pedido nuevo #${alertaPedido.id_pedido} · Mesa ${alertaPedido.numero_mesa}`, {
      icon: '🔔', duration: 4000,
    });
  }, [alertaPedido]);

  if (loading) return <CocinaSkeleton />;

  const porEstado = (e) => pedidos.filter(p => p.estado === e);

  function handleDragEnd({ active, over }) {
    if (!over) return;
    const id   = Number(active.id);
    const from = active.data.current?.estado;
    const to   = over.id;
    if (from === to) return;
    if (puedeTransicionar(from, to)) {
      avanzarEstado(id, to);
    } else {
      toast.error('Ese movimiento no está permitido');
    }
  }

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

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <main className={styles.kanban}>
          {COLUMNAS.map(({ estado, titulo, cls, Icon, countKey }) => {
            const col = porEstado(estado);
            const count = contadores[countKey];
            return (
              <div key={estado} className={styles.col}>
                <div className={`${styles.colHeader} ${styles[cls]}`}>
                  <span className={styles.colTitle}>{titulo}</span>
                  <span className={`${styles.colCount} ${estado === 'PENDIENTE' && count > 0 ? styles.countPulse : ''}`}>{count}</span>
                </div>
                <DroppableColumn estado={estado}>
                  {col.length === 0
                    ? <p className={styles.colEmpty}><Icon size={16} /> Arrastra o espera pedidos</p>
                    : (
                      <AnimatePresence>
                        {col.map(p => (
                          <DraggableCard key={p.id_pedido} pedido={p}>
                            <TarjetaPedido pedido={p} onAvanzar={avanzarEstado} isNuevo={nuevosIds.has(p.id_pedido)} />
                          </DraggableCard>
                        ))}
                      </AnimatePresence>
                    )
                  }
                </DroppableColumn>
              </div>
            );
          })}
        </main>
      </DndContext>
    </div>
  );
}
