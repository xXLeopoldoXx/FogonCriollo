
// El Fogón Criollo – useCocina Hook
// Lógica completa del panel de cocina

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { connectSocket, disconnectSocket, EVENTS } from '../services/socketService';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

function authHeaders(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

async function getPedidosCocina(token) {
  const res = await fetch(`${API_BASE}/pedidos/cocina`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error('Error al obtener pedidos');
  return res.json();
}

async function cambiarEstado(token, id_pedido, estado) {
  const res = await fetch(`${API_BASE}/pedidos/${id_pedido}/estado`, {
    method:  'PATCH',
    headers: authHeaders(token),
    body:    JSON.stringify({ estado }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message ?? 'Error al cambiar estado');
  }
  return res.json();
}

const SIGUIENTE_ESTADO = {
  PENDIENTE:  'EN_PROCESO',
  EN_PROCESO: 'LISTO',
};

const ORDEN = { PENDIENTE: 0, EN_PROCESO: 1, LISTO: 2 };

export function useCocina() {
  const { token }       = useAuth();
  const [pedidos,      setPedidos]      = useState([]);
  const [nuevosIds,    setNuevosIds]    = useState(new Set()); // IDs que son "nuevos" (para sonido)
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [connected,    setConnected]    = useState(false);
  const initialLoad    = useRef(true);

  /* ── Carga inicial ────────────────────────────────── */
  useEffect(() => {
    async function init() {
      try {
        const data = await getPedidosCocina(token);
        setPedidos(data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
        // Marcar que ya pasó la carga inicial
        setTimeout(() => { initialLoad.current = false; }, 500);
      }
    }
    init();
  }, [token]);

  /* ── Socket.io ────────────────────────────────────── */
  useEffect(() => {
    const socket = connectSocket(token);

    socket.on(EVENTS.CONNECTED,    () => setConnected(true));
    socket.on(EVENTS.DISCONNECTED, () => setConnected(false));

    socket.on(EVENTS.PEDIDO_NUEVO, (pedido) => {
      setPedidos(prev => {
        const existe = prev.find(p => p.id_pedido === pedido.id_pedido);
        if (existe) return prev;
        return [pedido, ...prev];
      });

      // Marcar como nuevo SOLO si ya pasó la carga inicial
      if (!initialLoad.current) {
        setNuevosIds(prev => new Set([...prev, pedido.id_pedido]));
        // Quitar el flag de "nuevo" después de 5 segundos
        setTimeout(() => {
          setNuevosIds(prev => {
            const next = new Set(prev);
            next.delete(pedido.id_pedido);
            return next;
          });
        }, 5000);
      }
    });

    socket.on(EVENTS.PEDIDO_ESTADO, ({ id_pedido, estado }) => {
      if (estado === 'ENTREGADO') {
        setPedidos(prev => prev.filter(p => p.id_pedido !== id_pedido));
      } else {
        setPedidos(prev =>
          prev.map(p => p.id_pedido === id_pedido ? { ...p, estado } : p)
        );
      }
    });

    return () => disconnectSocket();
  }, [token]);

  /* ── Avanzar estado con rollback ──────────────────── */
  const avanzarEstado = useCallback(async (id_pedido) => {
    const pedido = pedidos.find(p => p.id_pedido === id_pedido);
    if (!pedido) return;
    const nuevoEstado = SIGUIENTE_ESTADO[pedido.estado];
    if (!nuevoEstado) return;

    // Optimistic update
    setPedidos(prev =>
      prev.map(p => p.id_pedido === id_pedido ? { ...p, estado: nuevoEstado } : p)
    );

    try {
      await cambiarEstado(token, id_pedido, nuevoEstado);
      setError('');
    } catch (e) {
      // Rollback
      setPedidos(prev =>
        prev.map(p => p.id_pedido === id_pedido ? { ...p, estado: pedido.estado } : p)
      );
      setError(`Error al cambiar pedido #${id_pedido}: ${e.message}`);
      setTimeout(() => setError(''), 5000);
    }
  }, [pedidos, token]);

  /* ── Pedidos ordenados ────────────────────────────── */
  const pedidosOrdenados = [...pedidos].sort((a, b) => {
    const diff = (ORDEN[a.estado] ?? 9) - (ORDEN[b.estado] ?? 9);
    if (diff !== 0) return diff;
    return new Date(a.fecha_hora) - new Date(b.fecha_hora);
  });

  const contadores = {
    pendiente:  pedidos.filter(p => p.estado === 'PENDIENTE').length,
    en_proceso: pedidos.filter(p => p.estado === 'EN_PROCESO').length,
    listo:      pedidos.filter(p => p.estado === 'LISTO').length,
  };

  return {
    pedidos: pedidosOrdenados,
    nuevosIds,
    contadores, avanzarEstado,
    loading, error, connected,
  };
}
