// ============================================================
// El Fogón Criollo – controllers/adminController.js
// ============================================================

const adminModel  = require('../models/adminModel');
const excelUtils  = require('../utils/excelUtils');

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

async function exportarAuditoria(req, res) {
  const limite = Math.min(Number(req.query.limite) || 500, 5000);
  try {
    const registros  = await adminModel.getAuditoria(limite);
    const workbook   = await excelUtils.generarExcelAuditoria(registros);
    const filename   = `auditoria_${new Date().toISOString().slice(0, 10)}.xlsx`;

    res.setHeader('Content-Type',        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

module.exports = { getResumenHoy, getTopProductos, getReporteVentas, getAuditoria, getVentasPorHora, exportarAuditoria };
