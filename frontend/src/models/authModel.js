// ============================================================
// El Fogón Criollo – Auth Service
// Centraliza todas las llamadas al backend de autenticación
// ============================================================

const API_BASE = '/api';

/**
 * Realiza el login contra el backend.
 * POST /api/auth/login
 * Body: { username, password }
 * Returns: { token, usuario: { id, username, rol, nombre } }
 */
export async function login({ username, password }) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message ?? 'Credenciales incorrectas');
  }

  return res.json(); // { token, usuario }
}

/**
 * Cierra sesión (invalida el token en el servidor si aplica).
 * POST /api/auth/logout
 */
export async function logout() {
  const token = localStorage.getItem('fogon_token');
  if (!token) return;

  await fetch(`${API_BASE}/auth/logout`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => {}); // silent fail — igual limpiamos el storage

  localStorage.removeItem('fogon_token');
  localStorage.removeItem('fogon_user');
}

/**
 * Devuelve el usuario guardado en localStorage (sin fetch).
 * Útil para rehidratar el contexto al recargar la app.
 */
export function getStoredSession() {
  try {
    const token = localStorage.getItem('fogon_token');
    const user  = JSON.parse(localStorage.getItem('fogon_user') ?? 'null');
    return token && user ? { token, user } : null;
  } catch {
    return null;
  }
}

/**
 * Guarda la sesión en localStorage tras un login exitoso.
 */
export function storeSession({ token, usuario }) {
  localStorage.setItem('fogon_token', token);
  localStorage.setItem('fogon_user', JSON.stringify(usuario));
}
