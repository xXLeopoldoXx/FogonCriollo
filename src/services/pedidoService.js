
// El Fogón Criollo – Pedido Service
// Centraliza todas las llamadas al backend de pedidos

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

/* ── Helpers ─────────────────────────────────────────── */

function authHeaders(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    if (err.name === 'AbortError') throw new Error('La solicitud tardó demasiado. Verifica tu conexión.');
    throw err;
  }
}

async function handleResponse(res) {
  if (res.ok) return res.json();
  let msg = `Error ${res.status}`;
  try {
    const data = await res.json();
    msg = data.message ?? data.error ?? msg;
  } catch { /* ignore */ }
  throw new Error(msg);
}

/* ── GET /api/mesas ───────────────────────────────────── */
export async function getMesas(token) {
  const res = await fetchWithTimeout(
    `${API_BASE}/mesas`,
    { headers: authHeaders(token) }
  );
  return handleResponse(res);
}

/* ── GET /api/productos?disponible=true ───────────────── */
export async function getProductos(token) {
  const res = await fetchWithTimeout(
    `${API_BASE}/productos?disponible=true`,
    { headers: authHeaders(token) }
  );
  return handleResponse(res);
}

/* ── POST /api/pedidos ────────────────────────────────── */
export async function crearPedido({ token, id_mesa, id_mesero, items }) {
  // Validaciones de seguridad del lado cliente
  if (!id_mesa)         throw new Error('Mesa no especificada.');
  if (!id_mesero)       throw new Error('Mesero no identificado.');
  if (!items?.length)   throw new Error('El pedido no tiene ítems.');
  if (items.length > 20) throw new Error('Demasiados ítems en el pedido (máx. 20).');

  const itemsLimpios = items.map(i => ({
    id_producto: Number(i.id_producto),
    cantidad:    Number(i.cantidad),
    nota:        typeof i.nota === 'string' ? i.nota.trim().slice(0, 100) : null,
  }));

  const cantidadInvalida = itemsLimpios.find(i => i.cantidad < 1 || i.cantidad > 20);
  if (cantidadInvalida) throw new Error('Cantidad inválida en uno de los ítems.');

  const res = await fetchWithTimeout(
    `${API_BASE}/pedidos`,
    {
      method:  'POST',
      headers: authHeaders(token),
      body:    JSON.stringify({ id_mesa, id_mesero, items: itemsLimpios }),
    }
  );
  return handleResponse(res);
}

/* ── GET /api/pedidos/mesero/:id_mesero ───────────────── */
export async function getPedidosMesero(token, id_mesero) {
  if (!id_mesero) throw new Error('ID de mesero requerido.');
  const res = await fetchWithTimeout(
    `${API_BASE}/pedidos/mesero/${id_mesero}`,
    { headers: authHeaders(token) }
  );
  return handleResponse(res);
}

/* ── GET /api/pedidos/:id/cliente  (público, sin auth) ── */
export async function getClientePedido(idPedido) {
  if (!idPedido) throw new Error('ID de pedido requerido.');
  const res = await fetchWithTimeout(
    `${API_BASE}/pedidos/${idPedido}/cliente`
    // Sin Authorization header — ruta pública
  );
  return handleResponse(res);
}

/* ── GET /api/pedidos/cliente/espera  (público) ───────── */
export async function getClienteEspera() {
  const res = await fetchWithTimeout(
    `${API_BASE}/pedidos/cliente/espera`,
    {},
    6000
  );
  return handleResponse(res);
}
