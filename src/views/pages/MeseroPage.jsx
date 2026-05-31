// El Fogón Criollo – MeseroPage
// Panel completo del mesero — solo composición

import { Flame } from 'lucide-react';
import { useAuth }        from '../../context/AuthContext';
import { useMesero }      from '../../controllers/useMesero';
import { MesaGrid }       from '../components/mesero/MesaGrid';
import { MenuProductos }  from '../components/mesero/MenuProductos';
import { Carrito }        from '../components/mesero/Carrito';
import { PedidosActivos } from '../components/mesero/PedidosActivos';
import styles             from './MeseroPage.module.css';

/* ── Toast individual ─────────────────────────────────── */
function Toast({ toast }) {
  const cls = {
    success: styles.toastSuccess,
    error:   styles.toastError,
    warning: styles.toastWarning,
  }[toast.type] ?? styles.toastSuccess;

  return (
    <div className={`${styles.toast} ${cls}`} role="status" aria-live="polite">
      {toast.message}
    </div>
);
}

function OrderFlow({ mesaActiva, carrito, enviando, ultimoPedidoId }) {
  const steps = [
    { key: 'mesa', label: 'Mesa', active: !!mesaActiva, done: !!mesaActiva },
    { key: 'carta', label: 'Carta', active: !!mesaActiva && carrito.length > 0, done: carrito.length > 0 },
    { key: 'cocina', label: 'Cocina', active: enviando, done: !!ultimoPedidoId },
    { key: 'cliente', label: 'Cliente', active: !!ultimoPedidoId, done: !!ultimoPedidoId },
  ];

  return (
    <div className={styles.orderFlow} aria-label="Etapas de toma de pedido">
      {steps.map((step, index) => (
        <div
          key={step.key}
          className={[
            styles.flowStep,
            step.active ? styles.flowActive : '',
            step.done ? styles.flowDone : '',
          ].filter(Boolean).join(' ')}
        >
          <span className={styles.flowDot}>{index + 1}</span>
          <span>{step.label}</span>
        </div>
      ))}
    </div>
  );
}

export function MeseroPage() {
  const { user, signOut } = useAuth();
  const {
    mesasPorPiso, mesaActiva, setMesaActiva,
    productosPorCategoria,
    carrito, agregarProducto, quitarProducto, eliminarProducto, cambiarNota, total,
    pedidos,
    entregarPedido,
    enviarPedido, enviando,
    ultimoPedidoId,
    loading, toasts, connected,
  } = useMesero();

  if (loading) {
    return (
      <div className={styles.loadingScreen}>
        <span className={styles.loadFlame}><Flame size={48} /></span>
        <p className={styles.loadText}>Cargando sistema...</p>
      </div>
    );
  }

  return (
    <div className={styles.root}>

      {/* ── Topbar ────────────────────────────────── */}
      <header className={styles.topbar}>
        <div className={styles.topLeft}>
          <span className={styles.logo}><Flame size={24} /></span>
          <div>
            <span className={styles.brandName}>El Fogón Criollo</span>
            <span className={styles.userName}>· {user?.nombre ?? user?.username}</span>
          </div>
        </div>
        <div className={styles.topRight}>
          <span className={`${styles.connDot} ${connected ? styles.online : styles.offline}`} />
          <span className={styles.connLabel}>{connected ? 'En línea' : 'Sin conexión'}</span>
          <button className={styles.logoutBtn} onClick={signOut}>Salir</button>
        </div>
      </header>

      {/* ── Toast stack ───────────────────────────── */}
      <div className={styles.toastStack} aria-live="polite">
        {toasts.map(t => <Toast key={t.id} toast={t} />)}
      </div>

      <OrderFlow
        mesaActiva={mesaActiva}
        carrito={carrito}
        enviando={enviando}
        ultimoPedidoId={ultimoPedidoId}
      />

      {/* ── Layout principal ──────────────────────── */}
      <main className={styles.main}>

        {/* Columna izquierda: mesas + pedidos activos */}
        <aside className={styles.sidebar}>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Seleccionar mesa</h2>
            <MesaGrid
              mesasPorPiso={mesasPorPiso}
              mesaActiva={mesaActiva}
              onSelect={setMesaActiva}
            />
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              Pedidos activos
              {pedidos.filter(p => p.estado !== 'ENTREGADO').length > 0 && (
                <span className={styles.badge}>
                  {pedidos.filter(p => p.estado !== 'ENTREGADO').length}
                </span>
              )}
            </h2>
            <PedidosActivos pedidos={pedidos} onEntregar={entregarPedido} />
          </section>
        </aside>

        {/* Columna central: menú */}
        <section className={styles.menu}>
          <h2 className={styles.sectionTitle}>Menú</h2>
          <MenuProductos
            productosPorCategoria={productosPorCategoria}
            carrito={carrito}
            onAgregar={agregarProducto}
            onQuitar={quitarProducto}
          />
        </section>

        {/* Columna derecha: carrito */}
        <aside className={styles.carritoCol}>
          <Carrito
            mesaActiva={mesaActiva}
            carrito={carrito}
            total={total}
            onQuitar={quitarProducto}
            onEliminar={eliminarProducto}
            onEnviar={enviarPedido}
            enviando={enviando}
            onNotaChange={cambiarNota}
            ultimoPedidoId={ultimoPedidoId}
          />
        </aside>

      </main>
    </div>
  );
}
