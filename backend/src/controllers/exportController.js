// ============================================================
//  El Fogón Criollo — controllers/exportController.js
//  Endpoints para generar y descargar reportes
// ============================================================

const adminModel  = require('../models/adminModel');
const productoModel = require('../models/productoModel');
const {
  exportVentasExcel,
  exportTopProductosExcel,
  exportVentasPDF,
} = require('../services/exportService');
const ExcelJS  = require('exceljs');
const path     = require('path');
const { v4: uuidv4 } = require('uuid');
const logger   = require('../utils/logger');
const fs       = require('fs');

const EXPORT_DIR = process.env.EXPORT_DIR ?? path.join(__dirname, '../../exports');

// Asegurar directorio
if (!fs.existsSync(EXPORT_DIR)) fs.mkdirSync(EXPORT_DIR, { recursive: true });

// ── Ventas → Excel ────────────────────────────────────────
async function exportarVentasExcel(req, res) {
  const { desde, hasta } = req.query;
  const d = desde ?? new Date(new Date().setDate(1)).toISOString().split('T')[0];
  const h = hasta ?? new Date().toISOString().split('T')[0];

  try {
    const datos = await adminModel.getReporteVentas(d, h);
    const { url, filename } = await exportVentasExcel(datos, { desde: d, hasta: h });

    logger.info('Export Excel ventas', { user: req.user?.username, desde: d, hasta: h });
    res.json({ ok: true, url, filename, rows: datos.length });
  } catch (err) {
    logger.error('Error export Excel ventas', { error: err.message });
    res.status(500).json({ message: err.message });
  }
}

// ── Ventas → PDF ──────────────────────────────────────────
async function exportarVentasPDF(req, res) {
  const { desde, hasta } = req.query;
  const d = desde ?? new Date(new Date().setDate(1)).toISOString().split('T')[0];
  const h = hasta ?? new Date().toISOString().split('T')[0];

  try {
    const datos   = await adminModel.getReporteVentas(d, h);
    const resumen = await adminModel.getResumenHoy();
    const { url, filename } = await exportVentasPDF(datos, { desde: d, hasta: h, resumen });

    logger.info('Export PDF ventas', { user: req.user?.username });
    res.json({ ok: true, url, filename, rows: datos.length });
  } catch (err) {
    logger.error('Error export PDF ventas', { error: err.message });
    res.status(500).json({ message: err.message });
  }
}

// ── Productos → Excel ─────────────────────────────────────
async function exportarProductosExcel(req, res) {
  try {
    const productos = await productoModel.getAdmin();
    const result    = await exportTopProductosExcel(productos, { titulo: 'Catálogo de Productos' });
    logger.info('Export Excel productos', { user: req.user?.username });
    res.json({ ok: true, ...result, rows: productos.length });
  } catch (err) {
    logger.error('Error export productos', { error: err.message });
    res.status(500).json({ message: err.message });
  }
}

// ── Auditoría → Excel ─────────────────────────────────────
async function exportarAuditoriaExcel(req, res) {
  const limite = Math.min(Number(req.query.limite) || 500, 5000);

  try {
    const registros = await adminModel.getAuditoria(limite);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'El Fogón Criollo';
    const ws   = wb.addWorksheet('Auditoría', {
      properties: { tabColor: { argb: '5BA4F5' } },
      views: [{ state: 'frozen', ySplit: 2 }],
    });

    ws.mergeCells('A1:G1');
    ws.getCell('A1').value = '🔥 El Fogón Criollo — Auditoría de Pedidos';
    ws.getCell('A1').font  = { bold: true, size: 14, color: { argb: 'C85A1A' } };
    ws.getCell('A1').fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2C1F15' } };
    ws.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = 36;

    ws.columns = [
      { key: 'id_auditoria',   header: 'ID',              width: 8  },
      { key: 'id_pedido',      header: 'Pedido',          width: 10 },
      { key: 'mesa',           header: 'Mesa',            width: 10 },
      { key: 'estado_anterior',header: 'Estado anterior', width: 18 },
      { key: 'estado_nuevo',   header: 'Estado nuevo',    width: 18 },
      { key: 'cambiado_por',   header: 'Usuario',         width: 18 },
      { key: 'fecha_cambio',   header: 'Fecha/hora',      width: 22 },
    ];

    const hdr = ws.getRow(2);
    ws.columns.forEach((c, i) => hdr.getCell(i + 1).value = c.header);
    // Aplicar estilo manual a header
    hdr.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2C1F15' } };
      cell.font = { bold: true, color: { argb: 'F5EDD8' }, size: 11 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    hdr.height = 28;

    const ESTADO_COLORS = {
      PENDIENTE:  'F2A74B',
      EN_PROCESO: '5BA4F5',
      LISTO:      '4CAF50',
      ENTREGADO:  'CE93D8',
    };

    registros.forEach((r, i) => {
      const dr = ws.addRow({
        id_auditoria:    r.id_auditoria,
        id_pedido:       r.id_pedido,
        mesa:            `Mesa ${r.mesa}`,
        estado_anterior: r.estado_anterior ?? 'Nuevo',
        estado_nuevo:    r.estado_nuevo,
        cambiado_por:    r.cambiado_por ?? '—',
        fecha_cambio:    new Date(r.fecha_cambio).toLocaleString('es-PE'),
      });

      const isAlt = i % 2 === 0;
      dr.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isAlt ? '3D2B1A' : '2C1F15' } };
        cell.font = { color: { argb: 'F5EDD8' }, size: 10 };
      });

      // Color estado anterior
      const colAnterior = ESTADO_COLORS[r.estado_anterior];
      if (colAnterior) {
        dr.getCell('estado_anterior').font = { color: { argb: colAnterior }, bold: true, size: 10 };
      }
      // Color estado nuevo
      const colNuevo = ESTADO_COLORS[r.estado_nuevo];
      if (colNuevo) {
        dr.getCell('estado_nuevo').font = { color: { argb: colNuevo }, bold: true, size: 10 };
      }

      dr.height = 22;
    });

    ws.autoFilter = { from: 'A2', to: 'G2' };

    const filename = `auditoria_${uuidv4().slice(0, 8)}.xlsx`;
    const filepath = path.join(EXPORT_DIR, filename);
    await wb.xlsx.writeFile(filepath);

    logger.info('Export Excel auditoría', { user: req.user?.username, rows: registros.length });
    res.json({ ok: true, url: `/exports/${filename}`, filename, rows: registros.length });
  } catch (err) {
    logger.error('Error export auditoría', { error: err.message });
    res.status(500).json({ message: err.message });
  }
}

module.exports = {
  exportarVentasExcel,
  exportarVentasPDF,
  exportarProductosExcel,
  exportarAuditoriaExcel,
};
