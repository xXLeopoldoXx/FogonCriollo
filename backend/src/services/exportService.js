// ============================================================
//  El Fogón Criollo — services/exportService.js
//  Generación de Excel (ExcelJS) y PDF (PDFKit)
// ============================================================

const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs   = require('fs');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

const EXPORT_DIR = process.env.EXPORT_DIR ?? path.join(__dirname, '../../exports');

// Asegurar que el directorio de exportaciones existe
if (!fs.existsSync(EXPORT_DIR)) {
  fs.mkdirSync(EXPORT_DIR, { recursive: true });
}

// ── Estilos compartidos Excel ─────────────────────────────
const BRAND_COLOR   = 'C85A1A';
const HEADER_BG     = '2C1F15';
const HEADER_FONT   = 'F5EDD8';
const ALT_ROW_BG    = '3D2B1A';
const BORDER_COLOR  = '5D3A24';

function applyHeaderStyle(worksheet, headerRow) {
  headerRow.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } };
    cell.font = { bold: true, color: { argb: HEADER_FONT }, size: 11, name: 'Calibri' };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top:    { style: 'thin', color: { argb: BRAND_COLOR } },
      bottom: { style: 'thin', color: { argb: BRAND_COLOR } },
      left:   { style: 'thin', color: { argb: BORDER_COLOR } },
      right:  { style: 'thin', color: { argb: BORDER_COLOR } },
    };
  });
  headerRow.height = 28;
}

function applyDataRowStyle(row, rowIndex) {
  const isAlt = rowIndex % 2 === 0;
  row.eachCell({ includeEmpty: true }, cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isAlt ? ALT_ROW_BG : '2C1F15' } };
    cell.font = { color: { argb: 'F5EDD8' }, size: 10 };
    cell.alignment = { vertical: 'middle' };
    cell.border = {
      left:  { style: 'hair', color: { argb: BORDER_COLOR } },
      right: { style: 'hair', color: { argb: BORDER_COLOR } },
    };
  });
  row.height = 22;
}

// ── XLSX: Reporte de ventas ───────────────────────────────
async function exportVentasExcel(datos, { desde, hasta, titulo = 'Reporte de Ventas' } = {}) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'El Fogón Criollo';
  wb.created  = new Date();
  wb.modified = new Date();

  // ─ Hoja 1: Ventas por día ─
  const wsVentas = wb.addWorksheet('Ventas por día', {
    properties: { tabColor: { argb: BRAND_COLOR } },
    views: [{ state: 'frozen', ySplit: 4 }],
  });

  // Logo row
  wsVentas.mergeCells('A1:E1');
  const titleCell = wsVentas.getCell('A1');
  titleCell.value = '🔥 El Fogón Criollo — ' + titulo;
  titleCell.font  = { bold: true, size: 14, color: { argb: BRAND_COLOR } };
  titleCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  wsVentas.getRow(1).height = 36;

  // Período
  wsVentas.mergeCells('A2:E2');
  const periodoCell = wsVentas.getCell('A2');
  periodoCell.value = `Período: ${desde ?? '—'} al ${hasta ?? '—'}   |   Generado: ${new Date().toLocaleString('es-PE')}`;
  periodoCell.font  = { italic: true, color: { argb: 'C9B99A' }, size: 10 };
  periodoCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } };
  periodoCell.alignment = { horizontal: 'right' };
  wsVentas.getRow(2).height = 20;

  wsVentas.getRow(3).height = 6; // Espaciado

  // Headers
  wsVentas.columns = [
    { key: 'fecha',          header: 'Fecha',          width: 15 },
    { key: 'total_pedidos',  header: 'Pedidos',         width: 12 },
    { key: 'total_ingresos', header: 'Ingresos (S/)',   width: 16 },
    { key: 'ticket_prom',    header: 'Ticket promedio', width: 18 },
    { key: 'variacion',      header: 'Var. día ant.',   width: 16 },
  ];

  const headerRow = wsVentas.getRow(4);
  wsVentas.columns.forEach((col, i) => {
    headerRow.getCell(i + 1).value = col.header;
  });
  applyHeaderStyle(wsVentas, headerRow);

  // Datos
  let totalIngresosSum = 0;
  let totalPedidosSum  = 0;
  datos.forEach((row, i) => {
    const prevRow = datos[i - 1];
    const variacion = prevRow && prevRow.total_ingresos > 0
      ? ((row.total_ingresos - prevRow.total_ingresos) / prevRow.total_ingresos * 100).toFixed(1) + '%'
      : '—';
    const ticket = row.total_pedidos > 0
      ? (row.total_ingresos / row.total_pedidos).toFixed(2)
      : '0.00';

    const dataRow = wsVentas.addRow({
      fecha:          row.fecha,
      total_pedidos:  Number(row.total_pedidos),
      total_ingresos: Number(row.total_ingresos),
      ticket_prom:    Number(ticket),
      variacion,
    });
    applyDataRowStyle(dataRow, i);

    // Formato monetario
    dataRow.getCell('total_ingresos').numFmt = '"S/ "#,##0.00';
    dataRow.getCell('ticket_prom').numFmt    = '"S/ "#,##0.00';

    // Color variación
    if (variacion !== '—') {
      const isPos = !variacion.startsWith('-');
      dataRow.getCell('variacion').font = {
        color: { argb: isPos ? '4CAF50' : 'E05252' },
        bold: true,
        size: 10,
      };
    }

    totalIngresosSum += Number(row.total_ingresos);
    totalPedidosSum  += Number(row.total_pedidos);
  });

  // Fila de totales
  const totalRow = wsVentas.addRow({
    fecha:          'TOTAL',
    total_pedidos:  totalPedidosSum,
    total_ingresos: totalIngresosSum,
    ticket_prom:    totalPedidosSum > 0 ? totalIngresosSum / totalPedidosSum : 0,
    variacion:      '',
  });
  totalRow.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_COLOR } };
    cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 11 };
    cell.numFmt = '"S/ "#,##0.00';
    cell.border = {
      top: { style: 'medium', color: { argb: 'F2A74B' } },
    };
  });
  totalRow.height = 26;

  // Autofilter
  wsVentas.autoFilter = { from: 'A4', to: 'E4' };

  // ─ Hoja 2: Gráfico sparkline (datos para chart) ─
  const wsChart = wb.addWorksheet('Datos gráfico', {
    properties: { tabColor: { argb: '5BA4F5' } },
  });
  wsChart.addRow(['Fecha', 'Ingresos']);
  datos.forEach(r => wsChart.addRow([r.fecha, Number(r.total_ingresos)]));

  const filename = `ventas_${desde ?? 'all'}_${hasta ?? 'all'}_${uuidv4().slice(0, 8)}.xlsx`;
  const filepath = path.join(EXPORT_DIR, filename);
  await wb.xlsx.writeFile(filepath);
  logger.info('Excel generado', { filename });
  return { filename, filepath, url: `/exports/${filename}` };
}

// ── XLSX: Top productos ───────────────────────────────────
async function exportTopProductosExcel(datos, { limite = 10, titulo = 'Top Productos' } = {}) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'El Fogón Criollo';

  const ws = wb.addWorksheet('Top Productos', {
    properties: { tabColor: { argb: BRAND_COLOR } },
    views: [{ state: 'frozen', ySplit: 3 }],
  });

  ws.mergeCells('A1:E1');
  ws.getCell('A1').value     = `🔥 El Fogón Criollo — ${titulo}`;
  ws.getCell('A1').font      = { bold: true, size: 14, color: { argb: BRAND_COLOR } };
  ws.getCell('A1').fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } };
  ws.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 36;

  ws.columns = [
    { key: 'rank',          header: '#',            width: 6  },
    { key: 'nombre',        header: 'Producto',     width: 30 },
    { key: 'categoria',     header: 'Categoría',    width: 18 },
    { key: 'veces_pedido',  header: 'Veces pedido', width: 15 },
    { key: 'total_vendido', header: 'Total S/',     width: 15 },
  ];

  const hdr = ws.getRow(2);
  ws.columns.forEach((c, i) => hdr.getCell(i + 1).value = c.header);
  applyHeaderStyle(ws, hdr);

  datos.slice(0, limite).forEach((row, i) => {
    const dr = ws.addRow({
      rank:          i + 1,
      nombre:        row.nombre,
      categoria:     row.categoria ?? '—',
      veces_pedido:  Number(row.veces_pedido),
      total_vendido: Number(row.total_vendido),
    });
    applyDataRowStyle(dr, i);
    dr.getCell('total_vendido').numFmt = '"S/ "#,##0.00';
    if (i < 3) {
      dr.getCell('rank').font = { bold: true, color: { argb: ['F2A74B', 'C9B99A', 'CD7F32'][i] } };
    }
  });

  const filename = `top_productos_${uuidv4().slice(0, 8)}.xlsx`;
  const filepath = path.join(EXPORT_DIR, filename);
  await wb.xlsx.writeFile(filepath);
  return { filename, filepath, url: `/exports/${filename}` };
}

// ── PDF: Reporte de ventas ────────────────────────────────
async function exportVentasPDF(datos, { desde, hasta, resumen } = {}) {
  return new Promise((resolve, reject) => {
    const filename = `reporte_${desde ?? 'all'}_${hasta ?? 'all'}_${uuidv4().slice(0, 8)}.pdf`;
    const filepath = path.join(EXPORT_DIR, filename);
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 60, bottom: 60, left: 50, right: 50 },
      info: {
        Title:    'Reporte de Ventas — El Fogón Criollo',
        Author:   'Sistema El Fogón Criollo',
        Creator:  'El Fogón Criollo v2.0',
        Producer: 'PDFKit',
      },
    });

    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    const W = doc.page.width - 100;
    const BRAND = '#C85A1A';
    const DARK  = '#1A110A';
    const DIM   = '#9B8B7A';

    // ── Encabezado ──────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 80).fill(DARK);
    doc.fontSize(22).fillColor(BRAND).font('Helvetica-Bold')
       .text('El Fogón Criollo', 50, 22);
    doc.fontSize(10).fillColor('#F5EDD8').font('Helvetica')
       .text('Reporte de Ventas', 50, 48);
    doc.fillColor(DIM)
       .text(`Período: ${desde ?? '—'} al ${hasta ?? '—'}   ·   ${new Date().toLocaleDateString('es-PE', { dateStyle: 'long' })}`, 50, 62, { align: 'right', width: W });

    doc.moveDown(2.5);

    // ── KPIs resumen ─────────────────────────────────────
    if (resumen) {
      const kpis = [
        { label: 'Ingresos totales', value: `S/ ${Number(resumen.total_ingresos ?? 0).toFixed(2)}` },
        { label: 'Total pedidos',    value: String(resumen.total_pedidos ?? datos.length) },
        { label: 'Ticket promedio',  value: `S/ ${Number(resumen.ticket_promedio ?? 0).toFixed(2)}` },
      ];
      const kpiW = W / kpis.length;
      kpis.forEach((kpi, i) => {
        const x = 50 + i * kpiW;
        doc.rect(x, doc.y, kpiW - 10, 55).fill('#2C1F15').stroke('#C85A1A');
        doc.fontSize(10).fillColor(DIM).font('Helvetica')
           .text(kpi.label, x + 10, doc.y - 50, { width: kpiW - 20 });
        doc.fontSize(18).fillColor(BRAND).font('Helvetica-Bold')
           .text(kpi.value, x + 10, doc.y - 28, { width: kpiW - 20 });
      });
      doc.moveDown(4);
    }

    // ── Tabla ────────────────────────────────────────────
    const cols = [
      { key: 'fecha',          label: 'Fecha',          width: 110, align: 'left'  },
      { key: 'total_pedidos',  label: 'Pedidos',        width: 80,  align: 'right' },
      { key: 'total_ingresos', label: 'Ingresos',       width: 120, align: 'right' },
      { key: 'ticket',         label: 'Ticket prom.',   width: 120, align: 'right' },
    ];

    let y = doc.y;

    // Header de tabla
    doc.rect(50, y, W, 24).fill('#2C1F15');
    let x = 50;
    cols.forEach(col => {
      doc.fontSize(9).fillColor('#F5EDD8').font('Helvetica-Bold')
         .text(col.label, x + 6, y + 7, { width: col.width - 12, align: col.align });
      x += col.width;
    });
    y += 24;

    // Filas de datos
    datos.forEach((row, i) => {
      if (y > doc.page.height - 100) {
        doc.addPage();
        y = 60;
        // Re-dibujar header
        doc.rect(50, y, W, 24).fill('#2C1F15');
        let hx = 50;
        cols.forEach(col => {
          doc.fontSize(9).fillColor('#F5EDD8').font('Helvetica-Bold')
             .text(col.label, hx + 6, y + 7, { width: col.width - 12, align: col.align });
          hx += col.width;
        });
        y += 24;
      }

      const isAlt = i % 2 === 0;
      doc.rect(50, y, W, 20).fill(isAlt ? '#3D2B1A' : '#2C1F15');

      const ticket = row.total_pedidos > 0
        ? (row.total_ingresos / row.total_pedidos).toFixed(2)
        : '0.00';
      const values = {
        fecha:          String(row.fecha ?? ''),
        total_pedidos:  String(row.total_pedidos ?? 0),
        total_ingresos: `S/ ${Number(row.total_ingresos ?? 0).toFixed(2)}`,
        ticket:         `S/ ${ticket}`,
      };

      let cx = 50;
      cols.forEach(col => {
        doc.fontSize(9).fillColor('#F5EDD8').font('Helvetica')
           .text(values[col.key], cx + 6, y + 5, { width: col.width - 12, align: col.align });
        cx += col.width;
      });
      y += 20;
    });

    // Línea de total
    doc.rect(50, y, W, 26).fill(BRAND);
    const totalIngresos = datos.reduce((s, r) => s + Number(r.total_ingresos), 0);
    const totalPedidos  = datos.reduce((s, r) => s + Number(r.total_pedidos),  0);
    doc.fontSize(11).fillColor('#FFFFFF').font('Helvetica-Bold')
       .text('TOTAL', 56, y + 7, { width: 104 });
    doc.text(String(totalPedidos), 160, y + 7, { width: 74, align: 'right' });
    doc.text(`S/ ${totalIngresos.toFixed(2)}`, 240, y + 7, { width: 114, align: 'right' });

    // ── Pie de página ─────────────────────────────────────
    doc.fontSize(8).fillColor(DIM).font('Helvetica')
       .text(`El Fogón Criollo S.A.C. — Generado automáticamente el ${new Date().toLocaleString('es-PE')}`,
             50, doc.page.height - 40, { width: W, align: 'center' });

    doc.end();
    stream.on('finish', () => {
      logger.info('PDF generado', { filename });
      resolve({ filename, filepath, url: `/exports/${filename}` });
    });
    stream.on('error', reject);
  });
}

// ── Limpieza automática de exports antiguos (>24h) ────────
async function cleanOldExports(maxAgeHours = 24) {
  try {
    const files = fs.readdirSync(EXPORT_DIR);
    const now   = Date.now();
    let deleted = 0;
    files.forEach(file => {
      const fp = path.join(EXPORT_DIR, file);
      const stat = fs.statSync(fp);
      if (now - stat.mtimeMs > maxAgeHours * 3600 * 1000) {
        fs.unlinkSync(fp);
        deleted++;
      }
    });
    if (deleted > 0) logger.info(`Exports limpiados: ${deleted} archivos`);
  } catch (err) {
    logger.warn('Error limpiando exports', { error: err.message });
  }
}

module.exports = {
  exportVentasExcel,
  exportTopProductosExcel,
  exportVentasPDF,
  cleanOldExports,
};
