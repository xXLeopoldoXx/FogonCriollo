// ============================================================
// El Fogón Criollo – Admin Service
// Llamadas al backend para dashboard y reportes
// ============================================================

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

function authHeaders(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

/** GET /api/admin/resumen-hoy → usa v_resumen_hoy */
export async function getResumenHoy(token) {
  const res = await fetch(`${API_BASE}/admin/resumen-hoy`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error('Error al obtener resumen');
  return res.json();
}

/** GET /api/admin/top-productos?limite=8 → usa fn_top_productos */
export async function getTopProductos(token, limite = 8) {
  const res = await fetch(`${API_BASE}/admin/top-productos?limite=${limite}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error('Error al obtener top productos');
  return res.json();
}

/** GET /api/admin/ventas?desde=...&hasta=... → usa fn_reporte_ventas */
export async function getReporteVentas(token, desde, hasta) {
  const params = new URLSearchParams({ desde, hasta });
  const res = await fetch(`${API_BASE}/admin/ventas?${params}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error('Error al obtener reporte de ventas');
  return res.json();
}

/** GET /api/admin/auditoria?limite=50 → usa v_auditoria_pedidos */
export async function getAuditoria(token, limite = 50) {
  const res = await fetch(`${API_BASE}/admin/auditoria?limite=${limite}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error('Error al obtener auditoría');
  return res.json();
}

/** GET /api/admin/ventas-por-hora → picos de demanda del día */
export async function getVentasPorHora(token) {
  const res = await fetch(`${API_BASE}/admin/ventas-por-hora`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error('Error al obtener ventas por hora');
  return res.json();
}
