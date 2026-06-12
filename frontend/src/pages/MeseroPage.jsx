// ============================================================
//  El Fogón Criollo — MeseroPage v2
//  Flujo secuencial con Framer Motion y microanimaciones
// ============================================================

import { AnimatePresence, motion } from 'framer-motion';
import { Flame, Wifi, WifiOff, LogOut, ChevronLeft } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from '../stores/authStore';
import { useMesero, PASOS } from '../hooks/useMesero';

// Pasos visuales
import { StepMesa }         from '../components/mesero/StepMesa';
import { StepProductos }    from '../components/mesero/StepProductos';
import { StepConfirmacion } from '../components/mesero/StepConfirmacion';
import { StepEnviado }      from '../components/mesero/StepEnviado';
import { PedidosActivos }   from '../components/mesero/PedidosActivos';

import styles from './MeseroPage.module.css';

// ── Progress bar de pasos ────────────────────────────────
const PASO_LABELS = {
  [PASOS.MESA]:         { n: 1, label: 'Mesa'       },
  [PASOS.PRODUCTOS]:    { n: 2, label: 'Carta'      },
  [PASOS.CONFIRMACION]: { n: 3, label: 'Confirmar'  },
  [PASOS.ENVIADO]:      { n: 4, label: 'Listo'      },
};

function FlowStepper({ pasoActual, mesaActiva, totalItems, onBack }) {
  const pasos = Object.entries(PASO_LABELS);
  const indexActual = pasos.findIndex(([k]) => k === pasoActual);

  return (
    <div className={styles.stepper}>
      {pasoActual !== PASOS.MESA && pasoActual !== PASOS.ENVIADO && (
        <motion.button
          className={styles.backBtn}
          onClick={onBack}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          whileTap={{ scale: 0.94 }}
          aria-label="Volver al paso anterior"
        >
          <ChevronLeft size={16} />
        </motion.button>
      )}

      <div className={styles.stepperSteps}>
        {pasos.map(([key, { n, label }], i) => {
          const isDone    = i < indexActual;
          const isActive  = key === pasoActual;
          const isPending = i > indexActual;

          return (
            <div key={key} className={styles.stepperItem}>
              <motion.div
                className={`${styles.stepDot} ${isDone ? styles.stepDone : ''} ${isActive ? styles.stepActive : ''} ${isPending ? styles.stepPending : ''}`}
                animate={{ scale: isActive ? 1.15 : 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                {isDone ? '✓' : n}
              </motion.div>
              <span className={`${styles.stepLabel} ${isActive ? styles.stepLabelActive : ''} ${isPending ? styles.stepLabelPending : ''}`}>
                {label}
              </span>
              {i < pasos.length - 1 && (
                <div className={`${styles.stepLine} ${isDone ? styles.stepLineDone : ''}`}>
                  {isDone && (
                    <motion.div
                      className={styles.stepLineFill}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {mesaActiva && (
        <motion.div
          className={styles.stepperMesa}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 500 }}
        >
          Mesa {mesaActiva.numero}
          {totalItems > 0 && (
            <motion.span
              className={styles.stepperBadge}
              key={totalItems}
              initial={{ scale: 1.5 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 600 }}
            >
              {totalItems}
            </motion.span>
          )}
        </motion.div>
      )}
    </div>
  );
}

// ── Animación de transición entre pasos ──────────────────
const pageVariants = {
  initial: (dir) => ({
    x: dir > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  animate: {
    x: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 350, damping: 30 },
  },
  exit: (dir) => ({
    x: dir > 0 ? '-100%' : '100%',
    opacity: 0,
    transition: { duration: 0.2, ease: 'easeIn' },
  }),
};

export function MeseroPage() {
  const { user, signOut } = useAuthStore();
  const mesero = useMesero();
  const {
    pasoActual, setPasoActual, irAPaso, reiniciar,
    mesasPorPiso, mesaActiva, setMesaActiva,
    productosPorCategoria,
    carrito, agregarProducto, quitarProducto, eliminarProducto,
    cambiarNota, total, totalItems,
    pedidos, entregarPedido,
    enviarPedido, irAConfirmar,
    enviando, ultimoPedidoId,
    loading, connected,
  } = mesero;

  const pasoIndex = Object.keys(PASOS).indexOf(pasoActual.toUpperCase());

  const volverPaso = () => {
    const prev = {
      [PASOS.PRODUCTOS]:    PASOS.MESA,
      [PASOS.CONFIRMACION]: PASOS.PRODUCTOS,
    }[pasoActual];
    if (prev) setPasoActual(prev);
  };

  if (loading) {
    return (
      <div className={styles.loadingScreen}>
        <motion.div
          animate={{ filter: ['drop-shadow(0 0 8px rgba(232,131,74,0.5))', 'drop-shadow(0 0 24px rgba(232,131,74,1))', 'drop-shadow(0 0 8px rgba(232,131,74,0.5))'] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <Flame size={52} color="#E8834A" />
        </motion.div>
        <p className={styles.loadText}>Cargando sistema...</p>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#2A190C',
            color: '#F5EDD8',
            border: '1px solid rgba(200,90,26,0.4)',
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#4CAF50', secondary: '#F5EDD8' } },
          error:   { iconTheme: { primary: '#EF5350', secondary: '#F5EDD8' } },
        }}
      />

      {/* ── Topbar ──────────────────────────────────────── */}
      <header className={styles.topbar}>
        <div className={styles.topLeft}>
          <motion.div
            className={styles.logoWrap}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
          >
            <Flame size={22} className={styles.logoFlame} aria-hidden="true" />
            <div>
              <span className={styles.brandName}>El Fogón</span>
              <span className={styles.brandSub}>Criollo</span>
            </div>
          </motion.div>

          <div className={styles.userPill}>
            <div className={styles.userAvatar}>
              {(user?.nombre ?? user?.username ?? '?')[0].toUpperCase()}
            </div>
            <span className={styles.userName}>{user?.nombre ?? user?.username}</span>
          </div>
        </div>

        <div className={styles.topRight}>
          <div className={`${styles.connPill} ${connected ? styles.connOnline : styles.connOffline}`}>
            {connected
              ? <><Wifi size={12} /> En línea</>
              : <><WifiOff size={12} /> Sin conexión</>
            }
          </div>
          <motion.button
            className={styles.logoutBtn}
            onClick={signOut}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            title="Cerrar sesión"
          >
            <LogOut size={15} />
            <span>Salir</span>
          </motion.button>
        </div>
      </header>

      {/* ── Stepper ─────────────────────────────────────── */}
      <FlowStepper
        pasoActual={pasoActual}
        mesaActiva={mesaActiva}
        totalItems={totalItems}
        onBack={volverPaso}
      />

      {/* ── Contenido por paso ──────────────────────────── */}
      <main className={styles.main}>
        <div className={styles.stepContent}>
          <AnimatePresence mode="wait" custom={pasoIndex}>
            {pasoActual === PASOS.MESA && (
              <motion.div
                key="paso-mesa"
                custom={pasoIndex}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className={styles.stepPane}
              >
                <StepMesa
                  mesasPorPiso={mesasPorPiso}
                  mesaActiva={mesaActiva}
                  onSelect={setMesaActiva}
                  pedidos={pedidos}
                />
              </motion.div>
            )}

            {pasoActual === PASOS.PRODUCTOS && (
              <motion.div
                key="paso-productos"
                custom={pasoIndex}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className={styles.stepPane}
              >
                <StepProductos
                  productosPorCategoria={productosPorCategoria}
                  carrito={carrito}
                  onAgregar={agregarProducto}
                  onQuitar={quitarProducto}
                  onConfirmar={irAConfirmar}
                  total={total}
                  totalItems={totalItems}
                />
              </motion.div>
            )}

            {pasoActual === PASOS.CONFIRMACION && (
              <motion.div
                key="paso-confirmacion"
                custom={pasoIndex}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className={styles.stepPane}
              >
                <StepConfirmacion
                  mesa={mesaActiva}
                  carrito={carrito}
                  total={total}
                  onQuitar={quitarProducto}
                  onEliminar={eliminarProducto}
                  onNotaChange={cambiarNota}
                  onEnviar={enviarPedido}
                  onVolver={volverPaso}
                  enviando={enviando}
                />
              </motion.div>
            )}

            {pasoActual === PASOS.ENVIADO && (
              <motion.div
                key="paso-enviado"
                custom={pasoIndex}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className={styles.stepPane}
              >
                <StepEnviado
                  idPedido={ultimoPedidoId}
                  mesa={mesaActiva}
                  total={total}
                  onNuevoPedido={reiniciar}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Panel lateral de pedidos activos — siempre visible */}
        {pasoActual !== PASOS.ENVIADO && (
          <motion.aside
            className={styles.sidebar}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <PedidosActivos
              pedidos={pedidos}
              onEntregar={entregarPedido}
            />
          </motion.aside>
        )}
      </main>
    </div>
  );
}
