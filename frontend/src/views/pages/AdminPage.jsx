// ============================================================
// El Fogón Criollo – AdminPage
// Dashboard del administrador con KPIs, reportes y auditoría
// ============================================================

import { useState } from 'react';
import {
  LayoutDashboard, TrendingUp, UtensilsCrossed, Search,
  DollarSign, CheckCircle2, Clock, Bell, Flame,
} from 'lucide-react';
import { useAuth }          from '../../context/AuthContext';
import { useAdmin }         from '../../controllers/useAdmin';
import { KpiCard }          from '../components/admin/KpiCard';
import { BarChart }         from '../components/admin/BarChart';
import { TablaAuditoria }   from '../components/admin/TablaAuditoria';
import styles               from './AdminPage.module.css';

const NAV = [
  { key: 'dashboard', label: 'Dashboard',  icon: LayoutDashboard },
  { key: 'reportes',  label: 'Reportes',   icon: TrendingUp },
  { key: 'productos', label: 'Productos',  icon: UtensilsCrossed },
  { key: 'auditoria', label: 'Auditoría',  icon: Search },
];

const EMPTY_PRODUCT = {
  id_producto: null,
  nombre: '',
  precio: '',
  id_categoria: '',
  imagen_url: '',
  disponible: true,
};

function ProductosAdmin({ productos, categorias, onSave, onDelete }) {
  const [form, setForm] = useState(EMPTY_PRODUCT);
  const editing = Boolean(form.id_producto);

  function edit(producto) {
    setForm({
      id_producto: producto.id_producto,
      nombre: producto.nombre ?? '',
      precio: producto.precio ?? '',
      id_categoria: producto.id_categoria ?? '',
      imagen_url: producto.imagen_url ?? '',
      disponible: producto.disponible !== false,
    });
  }

  async function submit(e) {
    e.preventDefault();
    await onSave({
      ...form,
      precio: Number(form.precio),
      id_categoria: Number(form.id_categoria),
    });
    setForm(EMPTY_PRODUCT);
  }

  return (
    <div className={styles.productosGrid}>
      <form className={styles.productForm} onSubmit={submit}>
        <div className={styles.productPreview}>
          {form.imagen_url ? (
            <img src={form.imagen_url} alt={form.nombre || 'Vista previa'} />
          ) : (
            <span>Imagen</span>
          )}
        </div>

        <div className={styles.productFields}>
          <input
            className={styles.productInput}
            value={form.nombre}
            onChange={e => setForm(v => ({ ...v, nombre: e.target.value }))}
            placeholder="Nombre del producto"
            required
          />
          <input
            className={styles.productInput}
            value={form.precio}
            onChange={e => setForm(v => ({ ...v, precio: e.target.value }))}
            placeholder="Precio"
            type="number"
            min="0"
            step="0.01"
            required
          />
          <select
            className={styles.productInput}
            value={form.id_categoria}
            onChange={e => setForm(v => ({ ...v, id_categoria: e.target.value }))}
            required
          >
            <option value="">Categoría</option>
            {categorias.map(cat => (
              <option key={cat.id_categoria} value={cat.id_categoria}>{cat.nombre}</option>
            ))}
          </select>
          <input
            className={styles.productInput}
            value={form.imagen_url}
            onChange={e => setForm(v => ({ ...v, imagen_url: e.target.value }))}
            placeholder="URL de imagen"
          />
          <label className={styles.productCheck}>
            <input
              type="checkbox"
              checked={form.disponible}
              onChange={e => setForm(v => ({ ...v, disponible: e.target.checked }))}
            />
            Disponible en carta
          </label>
        </div>

        <div className={styles.productActions}>
          <button className={styles.filtroBtn} type="submit">
            {editing ? 'Guardar cambios' : 'Crear producto'}
          </button>
          {editing && (
            <button className={styles.secondaryBtn} type="button" onClick={() => setForm(EMPTY_PRODUCT)}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className={styles.productList}>
        {productos.map(producto => (
          <article key={producto.id_producto} className={styles.productRow}>
            <img src={producto.imagen_url} alt={producto.nombre} loading="lazy" />
            <div className={styles.productInfo}>
              <strong>{producto.nombre}</strong>
              <span>{producto.categoria} · S/ {Number(producto.precio).toFixed(2)}</span>
              <small>{producto.disponible ? 'Disponible' : 'Oculto en carta'}</small>
            </div>
            <div className={styles.productRowActions}>
              <button onClick={() => edit(producto)}>Editar</button>
              <button onClick={() => onSave({ ...producto, disponible: !producto.disponible })}>
                {producto.disponible ? 'Ocultar' : 'Activar'}
              </button>
              <button className={styles.dangerBtn} onClick={() => onDelete(producto.id_producto)}>
                Eliminar
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function AdminPage() {
  const { user, signOut }  = useAuth();
  const {
    resumen, topProductos, ventasDiarias, ventasPorHora, auditoria,
    loading, error, connected,
    seccion, setSeccion,
    refrescarVentas,
    productos, categorias,
    guardarProducto, borrarProducto,
  } = useAdmin();

  const [desde, setDesde] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;
  });
  const [hasta, setHasta] = useState(() => new Date().toISOString().split('T')[0]);

  if (loading) {
    return (
      <div className={styles.loadingScreen}>
        <span className={styles.loadFlame}><Flame size={48} /></span>
        <p className={styles.loadText}>Cargando datos...</p>
      </div>
    );
  }

  return (
    <div className={styles.root}>

      {/* Sidebar nav */}
      <nav className={styles.sidebar}>
        <div className={styles.sidebarLogo}>
          <span className={styles.logoFlame}><Flame size={28} /></span>
          <div>
            <p className={styles.logoName}>El Fogón</p>
            <p className={styles.logoSub}>Admin</p>
          </div>
        </div>

        <div className={styles.navItems}>
          {NAV.map(n => (
            <button
              key={n.key}
              className={`${styles.navBtn} ${seccion === n.key ? styles.navActive : ''}`}
              onClick={() => setSeccion(n.key)}
            >
              <n.icon size={18} className={styles.navIcon} />
              <span>{n.label}</span>
            </button>
          ))}
        </div>

        <div className={styles.sidebarFooter}>
          <span className={`${styles.connDot} ${connected ? styles.online : styles.offline}`} />
          <span className={styles.connLabel}>{connected ? 'En línea' : 'Sin conexión'}</span>
          <button className={styles.logoutBtn} onClick={signOut}>Salir</button>
        </div>
      </nav>

      {/* Main content */}
      <main className={styles.main}>

        {/* Header */}
        <header className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>
              {NAV.find(n => n.key === seccion)?.label}
            </h1>
            <p className={styles.pageSub}>
              Bienvenido, {user?.nombre ?? user?.username}
            </p>
          </div>
          <span className={styles.fecha}>
            {new Date().toLocaleDateString('es-PE', { weekday:'long', day:'numeric', month:'long' })}
          </span>
        </header>

        {error && <div className={styles.errorBanner}>{error}</div>}

        {/* ─── DASHBOARD ─── */}
        {seccion === 'dashboard' && resumen && (
          <div className={styles.dashGrid}>

            {/* KPIs */}
            <div className={styles.kpiRow}>
              <KpiCard
                label="Ingresos hoy"
                value={`S/ ${Number(resumen.ingresos_hoy).toFixed(2)}`}
                sub="pedidos entregados"
                accent="brand" icon={<DollarSign size={20} />}
              />
              <KpiCard
                label="Pedidos entregados"
                value={resumen.pedidos_entregados}
                sub="hoy"
                accent="green" icon={<CheckCircle2 size={20} />}
              />
              <KpiCard
                label="En proceso ahora"
                value={Number(resumen.pedidos_pendientes) + Number(resumen.pedidos_en_proceso)}
                sub="pendientes + en cocina"
                accent="blue" icon={<Clock size={20} />}
              />
              <KpiCard
                label="Listos para entregar"
                value={resumen.pedidos_listos}
                sub="esperando mesero"
                accent="amber" icon={<Bell size={20} />}
              />
            </div>

            {/* Gráficos */}
            <div className={styles.chartsRow}>
              <div className={styles.chartBox}>
                <BarChart
                  title="Ventas por hora (hoy)"
                  data={ventasPorHora}
                  labelKey="hora"
                  valueKey="ingresos"
                  prefix="S/"
                />
              </div>
              <div className={styles.chartBox}>
                <h3 className={styles.chartTitle}>Top productos del mes</h3>
                <div className={styles.topList}>
                  {topProductos.map((p, i) => (
                    <div key={p.id_producto} className={styles.topItem}>
                      <span className={styles.topRank}>{i + 1}</span>
                      <span className={styles.topNombre}>{p.nombre}</span>
                      <span className={styles.topVendido}>{p.veces_pedido} veces</span>
                      <span className={styles.topTotal}>S/ {Number(p.total_vendido).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ─── REPORTES ─── */}
        {seccion === 'reportes' && (
          <div className={styles.reportesGrid}>

            {/* Filtro fechas */}
            <div className={styles.filtroBox}>
              <h3 className={styles.filtroTitle}>Rango de fechas</h3>
              <div className={styles.filtroRow}>
                <div className={styles.filtroField}>
                  <label className={styles.filtroLabel}>Desde</label>
                  <input
                    type="date" className={styles.dateInput}
                    value={desde} onChange={e => setDesde(e.target.value)}
                  />
                </div>
                <div className={styles.filtroField}>
                  <label className={styles.filtroLabel}>Hasta</label>
                  <input
                    type="date" className={styles.dateInput}
                    value={hasta} onChange={e => setHasta(e.target.value)}
                  />
                </div>
                <button
                  className={styles.filtroBtn}
                  onClick={() => refrescarVentas(desde, hasta)}
                >
                  Actualizar
                </button>
              </div>
            </div>

            {/* Gráfico ventas diarias */}
            <div className={styles.chartBoxFull}>
              <BarChart
                title="Ventas diarias"
                data={ventasDiarias.map(v => ({ ...v, fecha: v.fecha?.slice(5) }))}
                labelKey="fecha"
                valueKey="total_ingresos"
                prefix="S/"
              />
            </div>

            {/* Tabla resumen ventas */}
            <div className={styles.tablaBox}>
              <h3 className={styles.chartTitle}>Detalle por día</h3>
              <div className={styles.ventasWrapper}>
                <table className={styles.ventasTable}>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Pedidos</th>
                      <th>Ingresos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ventasDiarias.map((v, i) => (
                      <tr key={i}>
                        <td>{v.fecha}</td>
                        <td>{v.total_pedidos}</td>
                        <td className={styles.ingreso}>S/ {Number(v.total_ingresos).toFixed(2)}</td>
                      </tr>
                    ))}
                    {ventasDiarias.length === 0 && (
                      <tr><td colSpan={3} className={styles.emptyTd}>Sin datos en este rango</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ─── PRODUCTOS ─── */}
        {seccion === 'productos' && (
          <ProductosAdmin
            productos={productos}
            categorias={categorias}
            onSave={guardarProducto}
            onDelete={borrarProducto}
          />
        )}

        {/* ─── AUDITORÍA ─── */}
        {seccion === 'auditoria' && (
          <div className={styles.auditoriaGrid}>
            <p className={styles.audDesc}>
              Historial completo de cambios de estado en pedidos — generado automáticamente por el trigger de la base de datos.
            </p>
            <TablaAuditoria registros={auditoria} />
          </div>
        )}

      </main>
    </div>
  );
}
