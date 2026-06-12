// ============================================================
// El Fogón Criollo – Admin Service
// Llamadas al backend para dashboard y reportes
// ============================================================

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

function authHeaders(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

async function handleJson(res, fallback) {
  if (res.ok) return res.status === 204 ? null : res.json();
  let message = fallback;
  try {
    const data = await res.json();
    message = data.message ?? message;
  } catch {}
  throw new Error(message);
}

function normalizeProducto(producto) {
  return {
    ...producto,
    id_producto: Number(producto.id_producto),
    id_categoria: Number(producto.id_categoria),
    precio: Number(producto.precio),
    disponible: producto.disponible !== false,
  };
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

/** GET /api/admin/auditoria/exportar → descarga .xlsx */
export async function exportarAuditoria(token, limite = 500) {
  const res = await fetch(`${API_BASE}/admin/auditoria/exportar?limite=${limite}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Error al exportar auditoría');
  const blob = await res.blob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `auditoria_${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** GET /api/admin/ventas-por-hora → picos de demanda del día */
export async function getVentasPorHora(token) {
  const res = await fetch(`${API_BASE}/admin/ventas-por-hora`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error('Error al obtener ventas por hora');
  return res.json();
}

export async function getCategorias(token) {
  const res = await fetch(`${API_BASE}/admin/categorias`, {
    headers: authHeaders(token),
  });
  return handleJson(res, 'Error al obtener categorias');
}

export async function getAdminProductos(token) {
  const res = await fetch(`${API_BASE}/admin/productos`, {
    headers: authHeaders(token),
  });
  const data = await handleJson(res, 'Error al obtener productos');
  return data.map(normalizeProducto);
}

export async function crearAdminProducto(token, producto) {
  const res = await fetch(`${API_BASE}/admin/productos`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(producto),
  });
  const data = await handleJson(res, 'Error al crear producto');
  return normalizeProducto(data);
}

export async function actualizarAdminProducto(token, id, producto) {
  const res = await fetch(`${API_BASE}/admin/productos/${id}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(producto),
  });
  const data = await handleJson(res, 'Error al actualizar producto');
  return normalizeProducto(data);
}

export async function eliminarAdminProducto(token, id) {
  const res = await fetch(`${API_BASE}/admin/productos/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  return handleJson(res, 'Error al eliminar producto');
}
