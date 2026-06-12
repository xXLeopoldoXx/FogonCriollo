import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';
import { connectSocket, disconnectSocket, EVENTS } from '../services/socketService';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

function authHeaders(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

async function getPedidosCocina(token) {
  const r = await fetch(`${API_BASE}/pedidos/cocina`, { headers: authHeaders(token) });
  if (!r.ok) throw new Error('Error al obtener pedidos');
  return r.json();
}

async function cambiarEstadoApi(token, id_pedido, estado) {
  const r = await fetch(`${API_BASE}/pedidos/${id_pedido}/estado`, {
    method: 'PATCH', headers: authHeaders(token), body: JSON.stringify({ estado }),
  });
  if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.message ?? 'Error al cambiar estado'); }
  return r.json();
}

const SIGUIENTE_ESTADO = { PENDIENTE: 'EN_PROCESO', EN_PROCESO: 'LISTO' };
const ORDEN = { PENDIENTE: 0, EN_PROCESO: 1, LISTO: 2 };

export function useCocina() {
  const { token } = useAuthStore();
  const [pedidos, setPedidos]         = useState([]);
  const [nuevosIds, setNuevosIds]     = useState(new Set());
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [connected, setConnected]     = useState(false);
  const [alertaPedido, setAlertaPedido] = useState(null);
  const initialLoad = useRef(true);

  useEffect(() => {
    getPedidosCocina(token)
      .then(data => setPedidos(data))
      .catch(e => setError(e.message))
      .finally(() => { setLoading(false); setTimeout(() => { initialLoad.current = false; }, 500); });
  }, [token]);

  useEffect(() => {
    const socket = connectSocket(token);
    socket.on(EVENTS.CONNECTED,    () => setConnected(true));
    socket.on(EVENTS.DISCONNECTED, () => setConnected(false));
    socket.on(EVENTS.PEDIDO_NUEVO, (pedido) => {
      setPedidos(prev => prev.find(p => p.id_pedido === pedido.id_pedido) ? prev : [pedido, ...prev]);
      if (!initialLoad.current) {
        setAlertaPedido(pedido);
        setTimeout(() => setAlertaPedido(null), 5200);
        setNuevosIds(prev => new Set([...prev, pedido.id_pedido]));
        setTimeout(() => setNuevosIds(prev => { const n = new Set(prev); n.delete(pedido.id_pedido); return n; }), 5000);
      }
    });
    socket.on(EVENTS.PEDIDO_ESTADO, ({ id_pedido, estado }) => {
      if (estado === 'ENTREGADO') setPedidos(prev => prev.filter(p => p.id_pedido !== id_pedido));
      else setPedidos(prev => prev.map(p => p.id_pedido === id_pedido ? { ...p, estado } : p));
    });
    return () => disconnectSocket();
  }, [token]);

  const avanzarEstado = useCallback(async (id_pedido) => {
    const pedido = pedidos.find(p => p.id_pedido === id_pedido);
    if (!pedido) return;
    const nuevoEstado = SIGUIENTE_ESTADO[pedido.estado];
    if (!nuevoEstado) return;
    setPedidos(prev => prev.map(p => p.id_pedido === id_pedido ? { ...p, estado: nuevoEstado } : p));
    try {
      await cambiarEstadoApi(token, id_pedido, nuevoEstado);
      setError('');
    } catch (e) {
      setPedidos(prev => prev.map(p => p.id_pedido === id_pedido ? { ...p, estado: pedido.estado } : p));
      toast.error(`Error pedido #${id_pedido}: ${e.message}`);
      setError(e.message);
      setTimeout(() => setError(''), 5000);
    }
  }, [pedidos, token]);

  const pedidosOrdenados = [...pedidos].sort((a, b) => {
    const diff = (ORDEN[a.estado] ?? 9) - (ORDEN[b.estado] ?? 9);
    return diff !== 0 ? diff : new Date(a.fecha_hora) - new Date(b.fecha_hora);
  });

  const contadores = {
    pendiente:  pedidos.filter(p => p.estado === 'PENDIENTE').length,
    en_proceso: pedidos.filter(p => p.estado === 'EN_PROCESO').length,
    listo:      pedidos.filter(p => p.estado === 'LISTO').length,
  };

  return { pedidos: pedidosOrdenados, nuevosIds, alertaPedido, contadores, avanzarEstado, loading, error, connected };
}
