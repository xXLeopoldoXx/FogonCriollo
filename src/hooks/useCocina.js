// ============================================================
// El Fogón Criollo – useCocina Hook
// Lógica completa del panel de cocina
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { connectSocket, disconnectSocket, EVENTS } from '../services/socketService';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

function authHeaders(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

async function getPedidosCocina(token) {
  const res = await fetch(`${API_BASE}/pedidos/cocina`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error('Error al obtener pedidos');
  return res.json(); // usa v_cocina_pedidos
}

async function cambiarEstado(token, id_pedido, estado) {
  const res = await fetch(`${API_BASE}/pedidos/${id_pedido}/estado`, {
    method:  'PATCH',
    headers: authHeaders(token),
    body:    JSON.stringify({ estado }),
  });
  if (!res.ok) throw new Error('Error al cambiar estado');
  return res.json();
}

// Transiciones válidas según la BD
const SIGUIENTE_ESTADO = {
  PENDIENTE:  'EN_PROCESO',
  EN_PROCESO: 'LISTO',
};

export function useCocina() {
  const { token } = useAuth();
  const [pedidos,   setPedidos]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [connected, setConnected] = useState(false);

  // Carga inicial
  useEffect(() => {
    async function init() {
      try {
        const data = await getPedidosCocina(token);
        setPedidos(data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [token]);

  // Socket: recibir pedidos nuevos del mesero
  useEffect(() => {
    const socket = connectSocket(token);

    socket.on(EVENTS.CONNECTED,    () => setConnected(true));
    socket.on(EVENTS.DISCONNECTED, () => setConnected(false));

    // Nuevo pedido llega desde el mesero
    socket.on(EVENTS.PEDIDO_NUEVO, (pedido) => {
      setPedidos(prev => {
        const existe = prev.find(p => p.id_pedido === pedido.id_pedido);
        if (existe) return prev;
        return [pedido, ...prev];
      });
    });

    // Actualización de estado reflejada (ej: otro dispositivo cocina)
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

  // Avanzar estado del pedido
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
    } catch (e) {
      // Revertir si falla
      setPedidos(prev =>
        prev.map(p => p.id_pedido === id_pedido ? { ...p, estado: pedido.estado } : p)
      );
      setError(e.message);
    }
  }, [pedidos, token]);

  // Ordenar: PENDIENTE primero, luego EN_PROCESO, luego por antigüedad
  const ORDEN = { PENDIENTE: 0, EN_PROCESO: 1, LISTO: 2 };
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
    contadores, avanzarEstado,
    loading, error, connected,
  };
}
