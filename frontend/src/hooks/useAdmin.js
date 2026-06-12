// ============================================================
//  El Fogón Criollo — hooks/useAdmin.js v2
//  React Query + exportaciones Excel/PDF
// ============================================================

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { connectSocket, disconnectSocket, EVENTS } from '../services/socketService';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

function authHeaders(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

async function apiFetch(url, token, options = {}) {
  const r = await fetch(`${API_BASE}${url}`, {
    headers: authHeaders(token),
    ...options,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.message ?? `Error en ${url}`);
  return data;
}

function hoy() {
  return new Date().toISOString().split('T')[0];
}
function inicioMes() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export function useAdmin() {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  const [seccion, setSeccion] = useState('dashboard');
  const [rango, setRango] = useState({ desde: inicioMes(), hasta: hoy() });
  const [connected, setConnected] = useState(false);

  // ── Queries ───────────────────────────────────────────
  const { data: resumen,       isLoading: loadRes  } = useQuery({ queryKey: ['admin-resumen'],       queryFn: () => apiFetch('/admin/resumen-hoy', token),        refetchInterval: 30000 });
  const { data: topProductos,  isLoading: loadTop  } = useQuery({ queryKey: ['admin-top'],           queryFn: () => apiFetch('/admin/top-productos?limite=8', token), staleTime: 120000 });
  const { data: ventasPorHora, isLoading: loadHora } = useQuery({ queryKey: ['admin-ventas-hora'],   queryFn: () => apiFetch('/admin/ventas-por-hora', token),     refetchInterval: 60000 });
  const { data: auditoria,     isLoading: loadAud  } = useQuery({ queryKey: ['admin-auditoria'],     queryFn: () => apiFetch('/admin/auditoria?limite=50', token), enabled: seccion === 'auditoria' });
  const { data: actividadUsuarios } = useQuery({ queryKey: ['admin-actividad'], queryFn: () => apiFetch('/admin/actividad-usuarios', token), enabled: seccion === 'dashboard', refetchInterval: 60000 });
  const { data: mesasRendimiento } = useQuery({ queryKey: ['admin-mesas'],     queryFn: () => apiFetch('/admin/mesas-rendimiento', token), enabled: seccion === 'dashboard', refetchInterval: 30000 });
  const { data: notificaciones }   = useQuery({ queryKey: ['admin-notifs'],    queryFn: () => apiFetch('/admin/notificaciones', token), refetchInterval: 20000 });
  const { data: categorias = [] }  = useQuery({ queryKey: ['categorias'],      queryFn: () => apiFetch('/admin/categorias', token) });
  const { data: productos = [],    isLoading: loadProds } = useQuery({ queryKey: ['admin-productos'],  queryFn: () => apiFetch('/admin/productos', token), enabled: seccion === 'productos' });

  const { data: ventasDiarias = [], refetch: refetchVentas } = useQuery({
    queryKey: ['admin-ventas', rango.desde, rango.hasta],
    queryFn:  () => apiFetch(`/admin/ventas?desde=${rango.desde}&hasta=${rango.hasta}`, token),
    enabled:  seccion === 'reportes',
  });

  const loading = loadRes || loadTop || loadHora;

  // ── Socket ────────────────────────────────────────────
  useEffect(() => {
    const socket = connectSocket(token);
    socket.on(EVENTS.CONNECTED,    () => setConnected(true));
    socket.on(EVENTS.DISCONNECTED, () => setConnected(false));
    socket.on(EVENTS.PEDIDO_NUEVO,  () => {
      queryClient.invalidateQueries({ queryKey: ['admin-resumen'] });
      queryClient.invalidateQueries({ queryKey: ['admin-mesas'] });
      queryClient.invalidateQueries({ queryKey: ['admin-notifs'] });
    });
    socket.on(EVENTS.PEDIDO_ESTADO, () => {
      queryClient.invalidateQueries({ queryKey: ['admin-resumen'] });
    });
    return () => disconnectSocket();
  }, [token, queryClient]);

  // ── Mutations CRUD productos ──────────────────────────
  const guardarProducto = useMutation({
    mutationFn: (prod) => {
      const isEdit = !!prod.id_producto;
      return apiFetch(
        isEdit ? `/admin/productos/${prod.id_producto}` : '/admin/productos',
        token,
        { method: isEdit ? 'PUT' : 'POST', body: JSON.stringify(prod) }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-productos'] });
      toast.success('Producto guardado.');
    },
    onError: (err) => toast.error(err.message),
  });

  const borrarProducto = useMutation({
    mutationFn: (id) => apiFetch(`/admin/productos/${id}`, token, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-productos'] });
      toast.success('Producto eliminado.');
    },
    onError: (err) => toast.error(err.message),
  });

  // ── Exportaciones ─────────────────────────────────────
  async function descargarExport(url, nombreArchivo) {
    const toastId = toast.loading(`Generando ${nombreArchivo}...`);
    try {
      // 1. Llamamos a tu API para que genere el archivo y nos devuelva el JSON
      const dataJson = await apiFetch(url, token);
      
      if (!dataJson.ok || !dataJson.url) {
        throw new Error(dataJson.message || "El servidor no pudo generar el archivo.");
      }

      // 2. MAGIA: En lugar de hacer un segundo fetch, creamos un enlace directo.
      // Le pasamos el token por la URL por si tu backend o Nginx necesitan validarlo.
      const urlDescargaDirecta = `${dataJson.url}?token=${token}`;

      // 3. Forzamos al navegador a abrir el archivo físico directamente
      const a = document.createElement('a');
      a.href = urlDescargaDirecta;
      
      // Mantenemos el nombre y la extensión original que envió el backend
      a.download = dataJson.filename || nombreArchivo;
      
      document.body.appendChild(a);
      a.click();
      a.remove();

      toast.success(`${nombreArchivo} descargado con éxito.`, { id: toastId });
    } catch (err) {
      console.error("❌ Falló la descarga del reporte:", err);
      toast.error(`Error: ${err.message}`, { id: toastId });
    }
  }


  const exportarVentasExcel  = () => descargarExport(`/admin/export/ventas/xlsx?desde=${rango.desde}&hasta=${rango.hasta}`, 'Excel de ventas');
  const exportarVentasPDF    = () => descargarExport(`/admin/export/ventas/pdf?desde=${rango.desde}&hasta=${rango.hasta}`, 'PDF de ventas');
  const exportarProductos    = () => descargarExport('/admin/export/productos/xlsx', 'Excel de productos');
  const exportarAuditoria    = () => descargarExport('/admin/export/auditoria/xlsx', 'Excel de auditoría');

  return {
    // Data
    resumen, topProductos, ventasDiarias, ventasPorHora, auditoria,
    actividadUsuarios, mesasRendimiento, notificaciones,
    productos, categorias,
    // Estado
    loading, connected, seccion, setSeccion,
    rango, setRango,
    // Acciones
    refrescarVentas: () => refetchVentas(),
    guardarProducto: (p) => guardarProducto.mutate(p),
    borrarProducto:  (id) => borrarProducto.mutate(id),
    guardando: guardarProducto.isPending,
    // Exportaciones
    exportarVentasExcel, exportarVentasPDF,
    exportarProductos, exportarAuditoria,
  };
}
