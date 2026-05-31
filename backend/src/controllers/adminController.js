// ============================================================
// El Fogón Criollo – controllers/adminController.js
// ============================================================

const adminModel = require('../models/adminModel');

async function getResumenHoy(req, res) {
  try {
    res.json(await adminModel.getResumenHoy());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function getTopProductos(req, res) {
  const limite = Number(req.query.limite) || 8;
  try {
    res.json(await adminModel.getTopProductos(limite));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function getReporteVentas(req, res) {
  const { desde, hasta } = req.query;
  if (!desde || !hasta) {
    return res.status(400).json({ message: 'Parámetros desde y hasta requeridos' });
  }
  try {
    res.json(await adminModel.getReporteVentas(desde, hasta));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function getAuditoria(req, res) {
  const limite = Number(req.query.limite) || 50;
  try {
    res.json(await adminModel.getAuditoria(limite));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function getVentasPorHora(req, res) {
  try {
    res.json(await adminModel.getVentasPorHora());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

module.exports = { getResumenHoy, getTopProductos, getReporteVentas, getAuditoria, getVentasPorHora };
