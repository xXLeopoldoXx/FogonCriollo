// ============================================================
//  El Fogón Criollo — AdminPage v2
//  Dashboard analítico con Recharts, exportaciones y notifs
// ============================================================

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard, TrendingUp, UtensilsCrossed, FileSearch,
  Bell, Flame, LogOut, Wifi, WifiOff,
  Download, FileSpreadsheet, FileText,
  AlertTriangle, Users, Map,
} from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import { useAuthStore }    from '../stores/authStore';
import { useAdmin }        from '../hooks/useAdmin';
import { KpiRow }          from '../components/admin/KpiRow';
import { VentasChart }     from '../components/admin/VentasChart';
import { HorasChart }      from '../components/admin/HorasChart';
import { TopProductos }    from '../components/admin/TopProductos';
import { MesasHeatmap }    from '../components/admin/MesasHeatmap';
import { ActividadUsers }  from '../components/admin/ActividadUsers';
import { TablaAuditoria }  from '../components/admin/TablaAuditoria';
import { ProductosAdmin }  from '../components/admin/ProductosAdmin';
import { NotifPanel }      from '../components/admin/NotifPanel';
import styles              from './AdminPage.module.css';

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard',  Icon: LayoutDashboard },
  { key: 'reportes',  label: 'Reportes',   Icon: TrendingUp      },
  { key: 'productos', label: 'Productos',  Icon: UtensilsCrossed },
  { key: 'auditoria', label: 'Auditoría',  Icon: FileSearch      },
];

// ── Panel de reportes con exportaciones ──────────────────
function PanelReportes({ ventasDiarias, rango, setRango, refrescarVentas, exportarVentasExcel, exportarVentasPDF }) {
  return (
    <div className={styles.reportesGrid}>
      {/* Filtros */}
      <div className={styles.filtroBox}>
        <h3 className={styles.boxTitle}>Rango de fechas</h3>
        <div className={styles.filtroRow}>
          <label className={styles.filtroField}>
            <span className={styles.filtroLabel}>Desde</span>
            <input
              type="date"
              className={styles.dateInput}
              value={rango.desde}
              onChange={e => setRango(r => ({ ...r, desde: e.target.value }))}
            />
          </label>
          <label className={styles.filtroField}>
            <span className={styles.filtroLabel}>Hasta</span>
            <input
              type="date"
              className={styles.dateInput}
              value={rango.hasta}
              onChange={e => setRango(r => ({ ...r, hasta: e.target.value }))}
            />
          </label>
          <button className={styles.filtroBtn} onClick={refrescarVentas}>
            Actualizar
          </button>
        </div>
      </div>

      {/* Gráfico de ventas diarias */}
      <div className={styles.chartBoxFull}>
        <VentasChart data={ventasDiarias} />
      </div>

      {/* Tabla resumen */}
      <div className={styles.tablaBox}>
        <div className={styles.tablaTitleRow}>
          <h3 className={styles.boxTitle}>Detalle por día</h3>
          <div className={styles.exportBtns}>
            <motion.button
              className={`${styles.exportBtn} ${styles.exportExcel}`}
              onClick={exportarVentasExcel}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              title="Exportar a Excel"
            >
              <FileSpreadsheet size={14} />
              Excel
            </motion.button>
            <motion.button
              className={`${styles.exportBtn} ${styles.exportPdf}`}
              onClick={exportarVentasPDF}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              title="Exportar a PDF"
            >
              <FileText size={14} />
              PDF
            </motion.button>
          </div>
        </div>

        <div className={styles.ventasWrapper}>
          <table className={styles.ventasTable}>
            <thead>
              <tr>
                <th>Fecha</th>
                <th className={styles.numCol}>Pedidos</th>
                <th className={styles.numCol}>Ingresos</th>
                <th className={styles.numCol}>Ticket prom.</th>
              </tr>
            </thead>
            <tbody>
              {ventasDiarias.map((v, i) => {
                const ticket = v.total_pedidos > 0
                  ? (v.total_ingresos / v.total_pedidos).toFixed(2)
                  : '0.00';
                return (
                  <motion.tr
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <td>{v.fecha}</td>
                    <td className={styles.numCol}>{v.total_pedidos}</td>
                    <td className={`${styles.numCol} ${styles.ingresoCell}`}>
                      S/ {Number(v.total_ingresos).toFixed(2)}
                    </td>
                    <td className={styles.numCol}>S/ {ticket}</td>
                  </motion.tr>
                );
              })}
              {ventasDiarias.length === 0 && (
                <tr>
                  <td colSpan={4} className={styles.emptyTd}>
                    Sin datos en este rango
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Panel de auditoría ────────────────────────────────────
function PanelAuditoria({ auditoria = [], exportarAuditoria }) {
  return (
    <div className={styles.auditoriaGrid}>
      <div className={styles.audTitleRow}>
        <div>
          <h3 className={styles.boxTitle}>Historial de cambios de estado</h3>
          <p className={styles.audDesc}>
            Generado automáticamente por trigger de base de datos.
          </p>
        </div>
        <motion.button
          className={`${styles.exportBtn} ${styles.exportExcel}`}
          onClick={exportarAuditoria}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
        >
          <FileSpreadsheet size={14} />
          Exportar Excel
        </motion.button>
      </div>
      <TablaAuditoria registros={auditoria} />
    </div>
  );
}

// ── Página principal ──────────────────────────────────────
export function AdminPage() {
  const { user, signOut } = useAuthStore();
  const {
    resumen, topProductos, ventasDiarias, ventasPorHora, auditoria,
    actividadUsuarios, mesasRendimiento, notificaciones,
    productos, categorias,
    loading, connected, seccion, setSeccion,
    rango, setRango, refrescarVentas,
    guardarProducto, borrarProducto, guardando,
    exportarVentasExcel, exportarVentasPDF,
    exportarProductos, exportarAuditoria,
  } = useAdmin();

  const [notifOpen, setNotifOpen] = useState(false);
  const alertCount = (notificaciones?.pedidos_demorados?.length ?? 0)
    + Number(notificaciones?.resumen?.en_proceso_criticos ?? 0);

  if (loading) {
    return (
      <div className={styles.loadScreen}>
        <motion.div
          animate={{ filter: ['drop-shadow(0 0 8px rgba(232,131,74,0.5))', 'drop-shadow(0 0 24px rgba(232,131,74,1))', 'drop-shadow(0 0 8px rgba(232,131,74,0.5))'] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <Flame size={52} color="#E8834A" />
        </motion.div>
        <p className={styles.loadText}>Cargando datos...</p>
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
          },
        }}
      />

      {/* ── Sidebar ───────────────────────────────────── */}
      <nav className={styles.sidebar}>
        {/* Logo */}
        <div className={styles.sidebarLogo}>
          <motion.div
            className={styles.logoIcon}
            animate={{ filter: ['drop-shadow(0 0 6px rgba(232,131,74,0.5))', 'drop-shadow(0 0 14px rgba(232,131,74,0.9))', 'drop-shadow(0 0 6px rgba(232,131,74,0.5))'] }}
            transition={{ duration: 2.5, repeat: Infinity }}
          >
            <Flame size={26} />
          </motion.div>
          <div>
            <p className={styles.logoName}>El Fogón</p>
            <p className={styles.logoSub}>Admin Panel</p>
          </div>
        </div>

        <div className={styles.navDivider} />

        {/* Navegación */}
        <nav className={styles.navItems}>
          {NAV_ITEMS.map(({ key, label, Icon }) => (
            <motion.button
              key={key}
              className={`${styles.navBtn} ${seccion === key ? styles.navActive : ''}`}
              onClick={() => setSeccion(key)}
              whileTap={{ scale: 0.97 }}
            >
              <Icon size={17} className={styles.navIcon} />
              <span>{label}</span>
              {seccion === key && (
                <motion.div
                  className={styles.navIndicator}
                  layoutId="nav-indicator"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </motion.button>
          ))}
        </nav>

        <div className={styles.navDivider} />

        {/* Footer del sidebar */}
        <div className={styles.sidebarFooter}>
          <div className={`${styles.connPill} ${connected ? styles.connOn : styles.connOff}`}>
            {connected ? <Wifi size={11} /> : <WifiOff size={11} />}
            {connected ? 'En línea' : 'Sin conexión'}
          </div>

          <div className={styles.userRow}>
            <div className={styles.userAvatar}>
              {(user?.nombre ?? user?.username ?? '?')[0].toUpperCase()}
            </div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{user?.nombre ?? user?.username}</span>
              <span className={styles.userRole}>Administrador</span>
            </div>
          </div>

          <button className={styles.logoutBtn} onClick={signOut}>
            <LogOut size={14} />
            Cerrar sesión
          </button>
        </div>
      </nav>

      {/* ── Main ──────────────────────────────────────── */}
      <main className={styles.main}>
        {/* Topbar de contenido */}
        <div className={styles.contentHeader}>
          <div>
            <h1 className={styles.pageTitle}>
              {NAV_ITEMS.find(n => n.key === seccion)?.label}
            </h1>
            <p className={styles.pageDate}>
              {new Date().toLocaleDateString('es-PE', {
                weekday: 'long', day: 'numeric', month: 'long',
              })}
            </p>
          </div>

          {/* Campana de notificaciones */}
          <div className={styles.contentHeaderRight}>
            <motion.button
              className={`${styles.notifBtn} ${alertCount > 0 ? styles.notifActive : ''}`}
              onClick={() => setNotifOpen(v => !v)}
              whileTap={{ scale: 0.93 }}
              aria-label={`${alertCount} alertas`}
            >
              <Bell size={18} />
              {alertCount > 0 && (
                <motion.span
                  className={styles.notifBadge}
                  key={alertCount}
                  initial={{ scale: 1.5 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 600 }}
                >
                  {alertCount}
                </motion.span>
              )}
            </motion.button>
          </div>
        </div>

        {/* Panel de notificaciones */}
        <AnimatePresence>
          {notifOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              className={styles.notifPanelWrap}
            >
              <NotifPanel
                notificaciones={notificaciones}
                onClose={() => setNotifOpen(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Contenido por sección ──────────────────── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={seccion}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
            className={styles.sectionContent}
          >

            {/* DASHBOARD */}
            {seccion === 'dashboard' && (
              <div className={styles.dashGrid}>
                {/* KPIs */}
                <KpiRow resumen={resumen} />

                {/* Fila de gráficos */}
                <div className={styles.chartsRow}>
                  <div className={styles.chartBox}>
                    <HorasChart data={ventasPorHora ?? []} />
                  </div>
                  <div className={styles.chartBox}>
                    <TopProductos data={topProductos ?? []} />
                  </div>
                </div>

                {/* Segunda fila: mesas + actividad */}
                <div className={styles.chartsRow}>
                  <div className={styles.chartBox}>
                    <MesasHeatmap mesas={mesasRendimiento ?? []} />
                  </div>
                  <div className={styles.chartBox}>
                    <ActividadUsers usuarios={actividadUsuarios ?? []} />
                  </div>
                </div>
              </div>
            )}

            {/* REPORTES */}
            {seccion === 'reportes' && (
              <PanelReportes
                ventasDiarias={ventasDiarias}
                rango={rango}
                setRango={setRango}
                refrescarVentas={refrescarVentas}
                exportarVentasExcel={exportarVentasExcel}
                exportarVentasPDF={exportarVentasPDF}
              />
            )}

            {/* PRODUCTOS */}
            {seccion === 'productos' && (
              <ProductosAdmin
                productos={productos}
                categorias={categorias}
                onSave={guardarProducto}
                onDelete={borrarProducto}
                guardando={guardando}
                onExportar={exportarProductos}
              />
            )}

            {/* AUDITORÍA */}
            {seccion === 'auditoria' && (
              <PanelAuditoria
                auditoria={auditoria}
                exportarAuditoria={exportarAuditoria}
              />
            )}

          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
