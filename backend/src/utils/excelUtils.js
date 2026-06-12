// ============================================================
// El Fogón Criollo – utils/excelUtils.js
// Utilitario de generación de archivos Excel (Apache POI equiv.)
// ============================================================

const ExcelJS = require('exceljs');

const AMBER      = 'FFB45309';
const AMBER_DARK = 'FF78350F';
const AMBER_LITE = 'FFFFF8E7';
const WHITE      = 'FFFFFFFF';
const GRAY       = 'FF6B7280';

function formatFecha(v) {
  if (!v) return '—';
  return new Date(v).toLocaleString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
}

function styleHeader(cell) {
  cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: AMBER } };
  cell.font      = { bold: true, size: 11, color: { argb: WHITE } };
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
  cell.border    = { bottom: { style: 'medium', color: { argb: AMBER_DARK } } };
}

function styleStripe(row) {
  row.eachCell({ includeEmpty: true }, cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AMBER_LITE } };
  });
}

/**
 * Genera un Workbook de Excel con el historial de auditoría de pedidos.
 * @param {Array} registros  Filas de v_auditoria_pedidos
 * @returns {ExcelJS.Workbook}
 */
async function generarExcelAuditoria(registros) {
  const wb = new ExcelJS.Workbook();
  wb.creator          = 'El Fogón Criollo';
  wb.lastModifiedBy   = 'Sistema';
  wb.created          = new Date();
  wb.modified         = new Date();

  const ws = wb.addWorksheet('Auditoría de Pedidos', {
    views:     [{ state: 'frozen', ySplit: 4 }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
  });

  // ── Fila 1: Título ──────────────────────────────────────
  ws.mergeCells('A1:I1');
  const title = ws.getCell('A1');
  title.value     = 'El Fogón Criollo — Auditoría de Pedidos';
  title.font      = { bold: true, size: 16, color: { argb: AMBER } };
  title.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 30;

  // ── Fila 2: Metadata ────────────────────────────────────
  ws.mergeCells('A2:I2');
  const meta = ws.getCell('A2');
  meta.value     = `Generado: ${formatFecha(new Date())}   ·   Total registros: ${registros.length}`;
  meta.font      = { italic: true, size: 10, color: { argb: GRAY } };
  meta.alignment = { horizontal: 'center' };
  ws.getRow(2).height = 18;

  // ── Fila 3: vacía ───────────────────────────────────────
  ws.getRow(3).height = 6;

  // ── Fila 4: Encabezados ─────────────────────────────────
  const HEADERS = [
    '#', 'ID Pedido', 'Mesa', 'Estado Anterior',
    'Estado Nuevo', 'Cambiado por', 'Fecha y hora', 'IP Origen', 'Observación',
  ];
  const headerRow = ws.getRow(4);
  headerRow.height = 24;
  HEADERS.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    styleHeader(cell);
  });

  // ── Filas de datos ──────────────────────────────────────
  registros.forEach((r, i) => {
    const dataRow = ws.addRow([
      i + 1,
      r.id_pedido,
      `Mesa ${r.mesa}`,
      r.estado_anterior ?? '—',
      r.estado_nuevo,
      r.cambiado_por   ?? '—',
      formatFecha(r.fecha_cambio),
      r.ip_origen      ?? '—',
      r.observacion    ?? '',
    ]);

    dataRow.height = 18;

    if (i % 2 === 0) styleStripe(dataRow);

    // Centrar columnas numéricas/cortas
    [1, 2, 3].forEach(col => {
      dataRow.getCell(col).alignment = { horizontal: 'center' };
    });
  });

  // ── Anchos de columna ───────────────────────────────────
  [6, 10, 10, 18, 16, 20, 22, 16, 34].forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });

  return wb;
}

module.exports = { generarExcelAuditoria };
