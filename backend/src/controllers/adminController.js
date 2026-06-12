// ============================================================
//  El Fogón Criollo — controllers/adminController.js v2
//  Dashboard avanzado con métricas, notificaciones y KPIs
// ============================================================

const adminModel = require('../models/adminModel');
const { cache }  = require('../db/redis');
const logger     = require('../utils/logger');

// ── Dashboard resumen hoy ─────────────────────────────────
async function getResumenHoy(req, res) {
  const CACHE_KEY = 'admin:resumen_hoy';
  try {
    const cached = await cache.get(CACHE_KEY);
    if (cached) return res.json(cached);

    const data = await adminModel.getResumenHoy();
    await cache.set(CACHE_KEY, data, cache.TTL.SHORT);
    res.json(data);
  } catch (err) {
    logger.error('getResumenHoy', { error: err.message });
    res.status(500).json({ message: err.message });
  }
}

// ── Top productos ─────────────────────────────────────────
async function getTopProductos(req, res) {
  const limite = Math.min(Number(req.query.limite) || 8, 50);
  const CACHE_KEY = `admin:top_productos:${limite}`;
  try {
    const cached = await cache.get(CACHE_KEY);
    if (cached) return res.json(cached);

    const data = await adminModel.getTopProductos(limite);
    await cache.set(CACHE_KEY, data, cache.TTL.MEDIUM);
    res.json(data);
  } catch (err) {
    logger.error('getTopProductos', { error: err.message });
    res.status(500).json({ message: err.message });
  }
}

// ── Reporte ventas con formato ────────────────────────────
async function getReporteVentas(req, res) {
  const { desde, hasta, formato = 'json' } = req.query;
  if (!desde || !hasta) {
    return res.status(400).json({ message: 'Parámetros desde y hasta requeridos.' });
  }

  // Solo json aquí — Excel/PDF van por exportController
  try {
    const data = await adminModel.getReporteVentas(desde, hasta);
    res.json(data);
  } catch (err) {
    logger.error('getReporteVentas', { error: err.message });
    res.status(500).json({ message: err.message });
  }
}

// ── Auditoría ─────────────────────────────────────────────
async function getAuditoria(req, res) {
  const limite = Math.min(Number(req.query.limite) || 50, 500);
  try {
    res.json(await adminModel.getAuditoria(limite));
  } catch (err) {
    logger.error('getAuditoria', { error: err.message });
    res.status(500).json({ message: err.message });
  }
}

// ── Ventas por hora ───────────────────────────────────────
async function getVentasPorHora(req, res) {
  const CACHE_KEY = 'admin:ventas_por_hora';
  try {
    const cached = await cache.get(CACHE_KEY);
    if (cached) return res.json(cached);

    const data = await adminModel.getVentasPorHora();
    await cache.set(CACHE_KEY, data, cache.TTL.SHORT);
    res.json(data);
  } catch (err) {
    logger.error('getVentasPorHora', { error: err.message });
    res.status(500).json({ message: err.message });
  }
}

// ── Actividad de usuarios ─────────────────────────────────
async function getActividadUsuarios(req, res) {
  try {
    const data = await adminModel.getActividadUsuarios();
    res.json(data);
  } catch (err) {
    logger.error('getActividadUsuarios', { error: err.message });
    res.status(500).json({ message: err.message });
  }
}

// ── Rendimiento de mesas ──────────────────────────────────
async function getMesasRendimiento(req, res) {
  const CACHE_KEY = 'admin:mesas_rendimiento';
  try {
    const cached = await cache.get(CACHE_KEY);
    if (cached) return res.json(cached);

    const data = await adminModel.getMesasRendimiento();
    await cache.set(CACHE_KEY, data, cache.TTL.MEDIUM);
    res.json(data);
  } catch (err) {
    logger.error('getMesasRendimiento', { error: err.message });
    res.status(500).json({ message: err.message });
  }
}

// ── Notificaciones del sistema ────────────────────────────
async function getNotificaciones(req, res) {
  try {
    const data = await adminModel.getNotificaciones();
    res.json(data);
  } catch (err) {
    logger.error('getNotificaciones', { error: err.message });
    res.status(500).json({ message: err.message });
  }
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
