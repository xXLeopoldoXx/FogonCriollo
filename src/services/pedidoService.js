// ============================================================
// El Fogón Criollo – Pedido Service
// Centraliza todas las llamadas al backend de pedidos
// ============================================================

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

function authHeaders(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

/**
 * GET /api/mesas
 * Returns: [{ id_mesa, numero, piso, capacidad }]
 */
export async function getMesas(token) {
  const res = await fetch(`${API_BASE}/mesas`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error('Error al obtener mesas');
  return res.json();
}

/**
 * GET /api/productos?disponible=true
 * Returns: [{ id_producto, nombre, precio, disponible, id_categoria, categoria }]
 */
export async function getProductos(token) {
  const res = await fetch(`${API_BASE}/productos?disponible=true`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error('Error al obtener productos');
  return res.json();
}

/**
 * POST /api/pedidos
 * Body: { id_mesa, id_mesero, items: [{ id_producto, cantidad }] }
 * Llama a fn_crear_pedido en PostgreSQL
 */
export async function crearPedido({ token, id_mesa, id_mesero, items }) {
  const res = await fetch(`${API_BASE}/pedidos`, {
    method:  'POST',
    headers: authHeaders(token),
    body:    JSON.stringify({ id_mesa, id_mesero, items }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message ?? 'Error al crear el pedido');
  }
  return res.json(); // { id_pedido }
}

/**
 * GET /api/pedidos/mesero/:id_mesero
 * Pedidos activos del mesero (usa v_mesero_pedidos)
 */
export async function getPedidosMesero(token, id_mesero) {
  const res = await fetch(`${API_BASE}/pedidos/mesero/${id_mesero}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error('Error al obtener pedidos');
  return res.json();
}
