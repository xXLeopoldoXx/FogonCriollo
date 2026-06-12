// ============================================================
//  El Fogón Criollo — Admin Components
//  TopProductos · MesasHeatmap · ActividadUsers · NotifPanel
// ============================================================

import { motion } from 'framer-motion';
import { AlertTriangle, X, Users, Table2, Clock } from 'lucide-react';
import styles from './AdminComponents.module.css';

// ── Top Productos ────────────────────────────────────────
export function TopProductos({ data = [] }) {
  const max = Math.max(...data.map(d => Number(d.veces_pedido)), 1);
  return (
    <div>
      <h3 className={styles.boxTitle}>Top productos del mes</h3>
      {data.length === 0 ? (
        <p className={styles.empty}>Sin datos todavía</p>
      ) : (
        <div className={styles.topList}>
          {data.map((p, i) => {
            const pct = (Number(p.veces_pedido) / max) * 100;
            return (
              <motion.div
                key={p.id_producto}
                className={styles.topItem}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <span className={`${styles.topRank} ${i < 3 ? styles[`rank${i}`] : ''}`}>
                  {i + 1}
                </span>
                <div className={styles.topInfo}>
                  <span className={styles.topNombre}>{p.nombre}</span>
                  <div className={styles.topBarWrap}>
                    <motion.div
                      className={styles.topBar}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: pct / 100 }}
                      transition={{ delay: i * 0.05 + 0.1, duration: 0.6, ease: 'easeOut' }}
                      style={{ transformOrigin: 'left' }}
                    />
                  </div>
                </div>
                <div className={styles.topStats}>
                  <span className={styles.topVeces}>{p.veces_pedido}×</span>
                  <span className={styles.topTotal}>S/ {Number(p.total_vendido).toFixed(0)}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Mesas Heatmap ────────────────────────────────────────
const ESTADO_COLORS = {
  PENDIENTE:  { cls: 'mesaPend', label: 'Pendiente' },
  EN_PROCESO: { cls: 'mesaProc', label: 'En cocina' },
  LISTO:      { cls: 'mesaList', label: 'Listo'     },
  null:       { cls: 'mesaLibre', label: 'Libre'    },
};

export function MesasHeatmap({ mesas = [] }) {
  const pisos = [...new Set(mesas.map(m => m.piso))].sort();

  return (
    <div>
      <h3 className={styles.boxTitle}>Estado de mesas — ahora</h3>
      {mesas.length === 0 ? (
        <p className={styles.empty}>Sin datos de mesas</p>
      ) : (
        <div className={styles.heatmapGrid}>
          {pisos.map(piso => (
            <div key={piso} className={styles.pisoGroup}>
              <span className={styles.pisoTag}>Piso {piso}</span>
              <div className={styles.mesasMini}>
                {mesas
                  .filter(m => m.piso === piso)
                  .map(m => {
                    const estadoCfg = ESTADO_COLORS[m.estado_actual] ?? ESTADO_COLORS[null];
                    return (
                      <motion.div
                        key={m.id_mesa}
                        className={`${styles.mesaMini} ${styles[estadoCfg.cls]}`}
                        whileHover={{ scale: 1.15 }}
                        title={`Mesa ${m.numero} — ${estadoCfg.label} | S/ ${Number(m.ingresos_hoy).toFixed(0)} hoy`}
                      >
                        <span className={styles.mesaMiniNum}>{m.numero}</span>
                        {Number(m.ingresos_hoy) > 0 && (
                          <span className={styles.mesaMiniIngresos}>
                            {Number(m.ingresos_hoy).toFixed(0)}
                          </span>
                        )}
                      </motion.div>
                    );
                  })
                }
              </div>
            </div>
          ))}
          {/* Leyenda */}
          <div className={styles.heatLeyenda}>
            {['Libre', 'Pendiente', 'En cocina', 'Listo'].map((l, i) => (
              <span key={l} className={styles.heatLeyItem}>
                <span className={`${styles.heatDot} ${styles[['mesaLibre','mesaPend','mesaProc','mesaList'][i]]}`} />
                {l}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Actividad de usuarios ────────────────────────────────
export function ActividadUsers({ usuarios = [] }) {
  const max = Math.max(...usuarios.map(u => Number(u.pedidos_hoy)), 1);
  return (
    <div>
      <h3 className={styles.boxTitle}>Actividad de meseros — hoy</h3>
      {usuarios.length === 0 ? (
        <p className={styles.empty}>Sin actividad registrada</p>
      ) : (
        <div className={styles.actividadList}>
          {usuarios.map((u, i) => {
            const pct = (Number(u.pedidos_hoy) / max) * 100;
            return (
              <motion.div
                key={u.username}
                className={styles.actItem}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <div className={styles.actAvatar}>
                  {u.nombre?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div className={styles.actInfo}>
                  <span className={styles.actNombre}>{u.nombre}</span>
                  <div className={styles.actBarWrap}>
                    <motion.div
                      className={styles.actBar}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: pct / 100 }}
                      transition={{ delay: i * 0.06 + 0.1, duration: 0.5 }}
                      style={{ transformOrigin: 'left' }}
                    />
                  </div>
                </div>
                <div className={styles.actStats}>
                  <span className={styles.actPedidos}>{u.pedidos_hoy}</span>
                  <span className={styles.actIngresos}>S/ {Number(u.ingresos_generados).toFixed(0)}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Panel de notificaciones ──────────────────────────────
export function NotifPanel({ notificaciones, onClose }) {
  const demorados = notificaciones?.pedidos_demorados ?? [];
  const noDisp    = notificaciones?.productos_no_disponibles ?? [];
  const resumen   = notificaciones?.resumen ?? {};

  const total = demorados.length + Number(resumen.en_proceso_criticos ?? 0);

  return (
    <div className={styles.notifPanel}>
      <div className={styles.notifHeader}>
        <div className={styles.notifTitleRow}>
          <AlertTriangle size={16} className={styles.notifIcon} />
          <h3 className={styles.notifTitle}>Alertas del sistema</h3>
          {total > 0 && <span className={styles.notifCount}>{total}</span>}
        </div>
        <button className={styles.notifClose} onClick={onClose} aria-label="Cerrar">
          <X size={16} />
        </button>
      </div>

      <div className={styles.notifBody}>
        {/* Pedidos demorados */}
        {demorados.length > 0 && (
          <div className={styles.notifSection}>
            <p className={styles.notifSectionTitle}>
              <Clock size={13} /> Pedidos demorados (+20 min)
            </p>
            {demorados.map(p => (
              <div key={p.id_pedido} className={styles.notifItem}>
                <span className={styles.notifItemId}>#{p.id_pedido}</span>
                <span className={styles.notifItemDesc}>
                  Mesa {p.mesa} · {p.mesero}
                </span>
                <span className={styles.notifItemTime}>{p.minutos_espera} min</span>
              </div>
            ))}
          </div>
        )}

        {/* Productos no disponibles */}
        {noDisp.length > 0 && (
          <div className={styles.notifSection}>
            <p className={styles.notifSectionTitle}>
              ⚠ Productos no disponibles
            </p>
            {noDisp.map(p => (
              <div key={p.id_producto} className={styles.notifItem}>
                <span className={styles.notifItemDesc}>{p.nombre}</span>
                <span className={styles.notifItemBadge}>Oculto</span>
              </div>
            ))}
          </div>
        )}

        {total === 0 && noDisp.length === 0 && (
          <p className={styles.notifOk}>✓ Todo funcionando con normalidad</p>
        )}
      </div>
    </div>
  );
}

// ── Tabla Auditoría ──────────────────────────────────────
const ESTADO_CFG = {
  PENDIENTE:  { cls: 'badgePend',  label: 'PENDIENTE'  },
  EN_PROCESO: { cls: 'badgeProc',  label: 'EN PROCESO' },
  LISTO:      { cls: 'badgeList',  label: 'LISTO'      },
  ENTREGADO:  { cls: 'badgeEntr',  label: 'ENTREGADO'  },
};

function formatFecha(iso) {
  return new Date(iso).toLocaleString('es-PE', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

export function TablaAuditoria({ registros = [] }) {
  if (!registros.length) {
    return <p className={styles.empty}>Sin registros de auditoría.</p>;
  }
  return (
    <div className={styles.audWrapper}>
      <table className={styles.audTable}>
        <thead>
          <tr>
            <th>Pedido</th>
            <th>Mesa</th>
            <th>Anterior</th>
            <th>Nuevo</th>
            <th>Usuario</th>
            <th>Fecha / hora</th>
          </tr>
        </thead>
        <tbody>
          {registros.map((r, i) => (
            <motion.tr
              key={r.id_auditoria}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: Math.min(i * 0.02, 0.4) }}
            >
              <td className={styles.audId}>#{r.id_pedido}</td>
              <td>Mesa {r.mesa}</td>
              <td>
                {r.estado_anterior
                  ? <span className={`${styles.badge} ${styles[ESTADO_CFG[r.estado_anterior]?.cls]}`}>{ESTADO_CFG[r.estado_anterior]?.label}</span>
                  : <span className={styles.nuevo}>Nuevo</span>
                }
              </td>
              <td>
                <span className={`${styles.badge} ${styles[ESTADO_CFG[r.estado_nuevo]?.cls]}`}>
                  {ESTADO_CFG[r.estado_nuevo]?.label}
                </span>
              </td>
              <td className={styles.audUser}>{r.cambiado_por ?? '—'}</td>
              <td className={styles.audFecha}>{formatFecha(r.fecha_cambio)}</td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
