// ============================================================
// El Fogón Criollo – TablaAuditoria Component
// Tabla de historial de cambios de estado
// ============================================================

import styles from './TablaAuditoria.module.css';

const ESTADO_CLS = {
  PENDIENTE:  'pendiente',
  EN_PROCESO: 'proceso',
  LISTO:      'listo',
  ENTREGADO:  'entregado',
};

function formatFecha(iso) {
  const d = new Date(iso);
  return d.toLocaleString('es-PE', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

export function TablaAuditoria({ registros }) {
  if (!registros.length) {
    return <p className={styles.empty}>Sin registros de auditoría.</p>;
  }

  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Pedido</th>
            <th>Mesa</th>
            <th>Estado anterior</th>
            <th>Estado nuevo</th>
            <th>Usuario</th>
            <th>Fecha / hora</th>
          </tr>
        </thead>
        <tbody>
          {registros.map(r => (
            <tr key={r.id_auditoria}>
              <td className={styles.id}>#{r.id_pedido}</td>
              <td>Mesa {r.mesa}</td>
              <td>
                {r.estado_anterior
                  ? <span className={`${styles.badge} ${styles[ESTADO_CLS[r.estado_anterior]]}`}>
                      {r.estado_anterior}
                    </span>
                  : <span className={styles.nuevo}>Nuevo</span>
                }
              </td>
              <td>
                <span className={`${styles.badge} ${styles[ESTADO_CLS[r.estado_nuevo]]}`}>
                  {r.estado_nuevo}
                </span>
              </td>
              <td className={styles.user}>{r.cambiado_por ?? '—'}</td>
              <td className={styles.fecha}>{formatFecha(r.fecha_cambio)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
