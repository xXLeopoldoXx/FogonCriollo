// ============================================================
// El Fogón Criollo – controllers/adminController.js
// ============================================================

const { query } = require('../db/pool');

// GET /api/admin/resumen-hoy  → v_resumen_hoy
async function getResumenHoy(req, res) {
  try {
    const { rows } = await query('SELECT * FROM v_resumen_hoy');
    res.json(rows[0] ?? {});
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// GET /api/admin/top-productos?limite=8  → fn_top_productos
async function getTopProductos(req, res) {
  const limite = Number(req.query.limite) || 8;
  try {
    const { rows } = await query('SELECT * FROM fn_top_productos($1)', [limite]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// GET /api/admin/ventas?desde=...&hasta=...  → fn_reporte_ventas
async function getReporteVentas(req, res) {
  const { desde, hasta } = req.query;
  if (!desde || !hasta) {
    return res.status(400).json({ message: 'Parámetros desde y hasta requeridos' });
  }
  try {
    const { rows } = await query(
      'SELECT * FROM fn_reporte_ventas($1::timestamp, $2::timestamp)',
      [desde + ' 00:00:00', hasta + ' 23:59:59']
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// GET /api/admin/auditoria?limite=50  → v_auditoria_pedidos
async function getAuditoria(req, res) {
  const limite = Number(req.query.limite) || 50;
  try {
    const { rows } = await query(
      'SELECT * FROM v_auditoria_pedidos LIMIT $1',
      [limite]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// GET /api/admin/ventas-por-hora  → reporte 8 del SQL
async function getVentasPorHora(req, res) {
  try {
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
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

module.exports = { getResumenHoy, getTopProductos, getReporteVentas, getAuditoria, getVentasPorHora };
