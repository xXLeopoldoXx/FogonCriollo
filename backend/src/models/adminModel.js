// ============================================================
//  El Fogón Criollo — models/adminModel.js v2
//  Queries avanzados para dashboard y reportes
// ============================================================

const { query } = require('../db/pool');

async function getResumenHoy() {
  const { rows } = await query(`
    SELECT
      COUNT(DISTINCT p.id_pedido) FILTER (WHERE p.estado = 'PENDIENTE')  AS pedidos_pendientes,
      COUNT(DISTINCT p.id_pedido) FILTER (WHERE p.estado = 'EN_PROCESO') AS pedidos_en_proceso,
      COUNT(DISTINCT p.id_pedido) FILTER (WHERE p.estado = 'LISTO')      AS pedidos_listos,
      COUNT(DISTINCT p.id_pedido) FILTER (WHERE p.estado = 'ENTREGADO')  AS pedidos_entregados,
      COALESCE(SUM(dp.cantidad * dp.precio_unitario) FILTER (WHERE p.estado = 'ENTREGADO'), 0) AS ingresos_hoy,
      COUNT(DISTINCT p.id_mesa) FILTER (WHERE p.estado != 'ENTREGADO' AND DATE(p.fecha_hora) = CURRENT_DATE) AS mesas_activas,
      ROUND(
        COALESCE(AVG(
          EXTRACT(EPOCH FROM (
            SELECT MIN(a.fecha_cambio)
            FROM auditoria_pedido a
            WHERE a.id_pedido = p.id_pedido AND a.estado_nuevo = 'ENTREGADO'
          ) - p.fecha_hora) / 60
        ) FILTER (WHERE p.estado = 'ENTREGADO'), 0)
      , 1) AS tiempo_promedio_min,
      COUNT(DISTINCT p.id_pedido) FILTER (WHERE DATE(p.fecha_hora) = CURRENT_DATE) AS pedidos_hoy_total
    FROM pedido p
    LEFT JOIN detalle_pedido dp ON dp.id_pedido = p.id_pedido
    WHERE DATE(p.fecha_hora) = CURRENT_DATE
  `);
  return rows[0] ?? {};
}

async function getTopProductos(limite) {
  const { rows } = await query(`
    SELECT
      pr.id_producto,
      pr.nombre,
      c.nombre AS categoria,
      SUM(dp.cantidad)::BIGINT AS veces_pedido,
      COALESCE(SUM(dp.cantidad * dp.precio_unitario), 0) AS total_vendido,
      COUNT(DISTINCT p.id_pedido) AS pedidos_con_producto
    FROM detalle_pedido dp
    JOIN pedido p      ON p.id_pedido   = dp.id_pedido
    JOIN producto pr   ON pr.id_producto = dp.id_producto
    JOIN categoria c   ON c.id_categoria = pr.id_categoria
    WHERE p.estado = 'ENTREGADO'
    GROUP BY pr.id_producto, pr.nombre, c.nombre
    ORDER BY veces_pedido DESC
    LIMIT $1
  `, [limite]);
  return rows;
}

async function getReporteVentas(desde, hasta) {
  const { rows } = await query(`
    SELECT * FROM fn_reporte_ventas($1::timestamp, $2::timestamp)
  `, [desde + ' 00:00:00', hasta + ' 23:59:59']);
  return rows;
}

async function getAuditoria(limite) {
  const { rows } = await query(`
    SELECT * FROM v_auditoria_pedidos LIMIT $1
  `, [limite]);
  return rows;
}

async function getVentasPorHora() {
  const { rows } = await query(`
    SELECT
      EXTRACT(HOUR FROM p.fecha_hora)::INTEGER AS hora,
      COUNT(DISTINCT p.id_pedido) AS total_pedidos,
      COALESCE(SUM(dp.cantidad * dp.precio_unitario), 0) AS ingresos
    FROM pedido p
    JOIN detalle_pedido dp ON dp.id_pedido = p.id_pedido
    WHERE p.estado = 'ENTREGADO' AND DATE(p.fecha_hora) = CURRENT_DATE
    GROUP BY EXTRACT(HOUR FROM p.fecha_hora)
    ORDER BY hora
  `);
  return rows;
}

// ── Nuevo: Actividad de usuarios ──────────────────────────
async function getActividadUsuarios() {
  const { rows } = await query(`
    SELECT
      u.username,
      m.nombre,
      u.rol,
      COUNT(p.id_pedido)                                    AS pedidos_hoy,
      COALESCE(SUM(dp.cantidad * dp.precio_unitario), 0)    AS ingresos_generados,
      MAX(p.fecha_hora)                                     AS ultimo_pedido
    FROM usuario u
    JOIN mesero m     ON m.id_mesero = u.id_mesero
    LEFT JOIN pedido p ON p.id_mesero = m.id_mesero
      AND DATE(p.fecha_hora) = CURRENT_DATE
      AND p.estado = 'ENTREGADO'
    LEFT JOIN detalle_pedido dp ON dp.id_pedido = p.id_pedido
    WHERE u.rol = 'MESERO'
    GROUP BY u.id_usuario, u.username, m.nombre, u.rol
    ORDER BY pedidos_hoy DESC, m.nombre
  `);
  return rows;
}

// ── Nuevo: Rendimiento de mesas ───────────────────────────
async function getMesasRendimiento() {
  const { rows } = await query(`
    SELECT
      m.id_mesa,
      m.numero,
      m.piso,
      m.capacidad,
      COUNT(DISTINCT p.id_pedido) FILTER (
        WHERE DATE(p.fecha_hora) = CURRENT_DATE
      ) AS pedidos_hoy,
      COALESCE(SUM(dp.cantidad * dp.precio_unitario) FILTER (
        WHERE DATE(p.fecha_hora) = CURRENT_DATE AND p.estado = 'ENTREGADO'
      ), 0) AS ingresos_hoy,
      -- Estado actual
      (
        SELECT p2.estado FROM pedido p2
        WHERE p2.id_mesa = m.id_mesa
          AND p2.estado NOT IN ('ENTREGADO')
        ORDER BY p2.fecha_hora DESC
        LIMIT 1
      ) AS estado_actual,
      (
        SELECT p2.fecha_hora FROM pedido p2
        WHERE p2.id_mesa = m.id_mesa
          AND p2.estado NOT IN ('ENTREGADO')
        ORDER BY p2.fecha_hora DESC
        LIMIT 1
      ) AS pedido_desde
    FROM mesa m
    LEFT JOIN pedido p         ON p.id_mesa = m.id_mesa
    LEFT JOIN detalle_pedido dp ON dp.id_pedido = p.id_pedido
    GROUP BY m.id_mesa, m.numero, m.piso, m.capacidad
    ORDER BY m.piso, m.numero
  `);
  return rows;
}

// ── Nuevo: Notificaciones del sistema ─────────────────────
async function getNotificaciones() {
  const { rows: pedidosDemorados } = await query(`
    SELECT
      p.id_pedido,
      m.numero AS mesa,
      m.piso,
      p.estado,
      EXTRACT(EPOCH FROM (NOW() - p.fecha_hora))::INTEGER / 60 AS minutos_espera,
      me.nombre AS mesero
    FROM pedido p
    JOIN mesa   m  ON m.id_mesa    = p.id_mesa
    JOIN mesero me ON me.id_mesero = p.id_mesero
    WHERE p.estado IN ('PENDIENTE', 'EN_PROCESO')
      AND EXTRACT(EPOCH FROM (NOW() - p.fecha_hora)) > 1200
    ORDER BY p.fecha_hora ASC
    LIMIT 10
  `);

  const { rows: productosAgotados } = await query(`
    SELECT nombre, id_producto FROM producto WHERE disponible = false LIMIT 10
  `);

  const { rows: resumenAlertas } = await query(`
    SELECT
      COUNT(*) FILTER (WHERE estado = 'PENDIENTE') AS pendientes,
      COUNT(*) FILTER (WHERE estado = 'EN_PROCESO'
        AND EXTRACT(EPOCH FROM (NOW() - fecha_hora)) > 900) AS en_proceso_criticos,
      COUNT(*) FILTER (WHERE estado = 'LISTO') AS listos_sin_entregar
    FROM pedido
    WHERE estado NOT IN ('ENTREGADO')
      AND DATE(fecha_hora) = CURRENT_DATE
  `);

  return {
    pedidos_demorados: pedidosDemorados,
    productos_no_disponibles: productosAgotados,
    resumen: resumenAlertas[0] ?? {},
  };
}

module.exports = {
  getResumenHoy,
  getTopProductos,
  getReporteVentas,
  getAuditoria,
  getVentasPorHora,
  getActividadUsuarios,
  getMesasRendimiento,
  getNotificaciones,
};
