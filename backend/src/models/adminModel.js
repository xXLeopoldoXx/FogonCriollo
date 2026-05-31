// ============================================================
// El Fogón Criollo – models/adminModel.js
// Acceso a datos: reportes y auditoría
// ============================================================

const { query } = require('../db/pool');

async function getResumenHoy() {
  const { rows } = await query('SELECT * FROM v_resumen_hoy');
  return rows[0] ?? {};
}

async function getTopProductos(limite) {
  const { rows } = await query('SELECT * FROM fn_top_productos($1)', [limite]);
  return rows;
}

async function getReporteVentas(desde, hasta) {
  const { rows } = await query(
    'SELECT * FROM fn_reporte_ventas($1::timestamp, $2::timestamp)',
    [desde + ' 00:00:00', hasta + ' 23:59:59']
  );
  return rows;
}

async function getAuditoria(limite) {
  const { rows } = await query(
    'SELECT * FROM v_auditoria_pedidos LIMIT $1',
    [limite]
  );
  return rows;
}

async function getVentasPorHora() {
  const { rows } = await query(
    `SELECT
       EXTRACT(HOUR FROM p.fecha_hora)::INTEGER AS hora,
       COUNT(DISTINCT p.id_pedido)              AS total_pedidos,
       COALESCE(SUM(dp.cantidad * dp.precio_unitario), 0) AS ingresos
     FROM pedido p
     JOIN detalle_pedido dp ON dp.id_pedido = p.id_pedido
     WHERE p.estado = 'ENTREGADO'::estado_pedido
       AND DATE(p.fecha_hora) = CURRENT_DATE
     GROUP BY EXTRACT(HOUR FROM p.fecha_hora)
     ORDER BY hora`
  );
  return rows;
}

module.exports = { getResumenHoy, getTopProductos, getReporteVentas, getAuditoria, getVentasPorHora };
