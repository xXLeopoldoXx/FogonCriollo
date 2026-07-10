import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';
import { connectSocket, disconnectSocket, EVENTS } from '../services/socketService';
import { cambiarEstadoPedido, getPedidosCocina } from '../models/pedidoModel';
import {
  actualizarEstadoPedido,
  agregarPedidoActivo,
  contarEstadosCocina,
  getNextEstado,
  ordenarPedidosCocina,
  puedeTransicionar,
} from '../models/pedidoStateMachine';
import toast from 'react-hot-toast';

const defaultApi = { getPedidosCocina, cambiarEstadoPedido };

export function useCocina({ socket: socketOverride, api = defaultApi, initialLoadDelay = 500 } = {}) {
  const { token } = useAuthStore();
  const [pedidos, setPedidos]         = useState([]);
  const [nuevosIds, setNuevosIds]     = useState(new Set());
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [connected, setConnected]     = useState(false);
  const [alertaPedido, setAlertaPedido] = useState(null);
  const initialLoad = useRef(true);

  useEffect(() => {
    api.getPedidosCocina(token)
      .then(data => setPedidos(data))
      .catch(e => setError(e.message))
      .finally(() => { setLoading(false); setTimeout(() => { initialLoad.current = false; }, initialLoadDelay); });
  }, [api, initialLoadDelay, token]);

  useEffect(() => {
    const socket = socketOverride ?? connectSocket(token);
    socket.on(EVENTS.CONNECTED,    () => setConnected(true));
    socket.on(EVENTS.DISCONNECTED, () => setConnected(false));
    socket.on(EVENTS.PEDIDO_NUEVO, (pedido) => {
      setPedidos(prev => agregarPedidoActivo(prev, pedido));
      if (!initialLoad.current) {
        setAlertaPedido(pedido);
        setTimeout(() => setAlertaPedido(null), 5200);
        setNuevosIds(prev => new Set([...prev, pedido.id_pedido]));
        setTimeout(() => setNuevosIds(prev => { const n = new Set(prev); n.delete(pedido.id_pedido); return n; }), 5000);
      }
    });
    socket.on(EVENTS.PEDIDO_ESTADO, (payload = {}) => {
      const { id_pedido, estado } = payload;
      setPedidos(prev => {
        try { return actualizarEstadoPedido(prev, id_pedido, estado); }
        catch { return prev; }
      });
    });
    return () => {
      if (!socketOverride) disconnectSocket();
    };
  }, [socketOverride, token]);

  const avanzarEstado = useCallback(async (id_pedido, estadoSolicitado) => {
    const pedido = pedidos.find(p => p.id_pedido === id_pedido);
    if (!pedido) return;
    const nuevoEstado = estadoSolicitado ?? getNextEstado(pedido.estado);
    if (!puedeTransicionar(pedido.estado, nuevoEstado)) {
      setError(`Transición inválida: ${pedido.estado} -> ${nuevoEstado}`);
      return;
    }
    setPedidos(prev => actualizarEstadoPedido(prev, id_pedido, nuevoEstado));
    try {
      await api.cambiarEstadoPedido(token, id_pedido, nuevoEstado);
      setError('');
    } catch (e) {
      setPedidos(prev => prev.map(p => p.id_pedido === id_pedido ? { ...p, estado: pedido.estado } : p));
      toast.error(`Error pedido #${id_pedido}: ${e.message}`);
      setError(e.message);
      setTimeout(() => setError(''), 5000);
    }
  }, [api, pedidos, token]);

  const pedidosOrdenados = ordenarPedidosCocina(pedidos);
  const contadores = contarEstadosCocina(pedidos);

  return { pedidos: pedidosOrdenados, nuevosIds, alertaPedido, contadores, avanzarEstado, loading, error, connected };
}
