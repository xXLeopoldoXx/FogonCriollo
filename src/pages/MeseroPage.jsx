// ============================================================
// El Fogón Criollo – MeseroPage
// Panel completo del mesero — solo composición
// ============================================================

import { useAuth }         from '../context/AuthContext';
import { useMesero }       from '../hooks/useMesero';
import { MesaGrid }        from '../components/mesero/MesaGrid';
import { MenuProductos }   from '../components/mesero/MenuProductos';
import { Carrito }         from '../components/mesero/Carrito';
import { PedidosActivos }  from '../components/mesero/PedidosActivos';
import styles              from './MeseroPage.module.css';

export function MeseroPage() {
  const { user, signOut } = useAuth();
  const {
    mesasPorPiso, mesaActiva, setMesaActiva,
    productosPorCategoria,
    carrito, agregarProducto, quitarProducto, eliminarProducto, total,
    pedidos,
    enviarPedido, enviando,
    loading, error, exito, connected,
  } = useMesero();

  if (loading) {
    return (
      <div className={styles.loadingScreen}>
        <span className={styles.loadFlame}>🔥</span>
        <p className={styles.loadText}>Cargando sistema...</p>
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
            <span className={styles.userName}>· {user?.nombre ?? user?.username}</span>
          </div>
        </div>
        <div className={styles.topRight}>
          <span className={`${styles.connDot} ${connected ? styles.online : styles.offline}`} />
          <span className={styles.connLabel}>{connected ? 'En línea' : 'Sin conexión'}</span>
          <button className={styles.logoutBtn} onClick={signOut}>Salir</button>
        </div>
      </header>

      {/* Notificaciones */}
      {exito && <div className={styles.toast} role="status">{exito}</div>}
      {error && <div className={styles.toastError} role="alert">{error}</div>}

      {/* Layout principal */}
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
              Mis pedidos activos
              {pedidos.filter(p => p.estado !== 'ENTREGADO').length > 0 && (
                <span className={styles.badge}>
                  {pedidos.filter(p => p.estado !== 'ENTREGADO').length}
                </span>
              )}
            </h2>
            <PedidosActivos pedidos={pedidos} />
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
          />
        </aside>

      </main>
    </div>
  );
}
