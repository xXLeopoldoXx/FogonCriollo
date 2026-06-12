// ============================================================
//  El Fogón Criollo — hooks/useMesero.js v2
//  Flujo secuencial: Mesa → Productos → Confirmación → Enviado
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { connectSocket, disconnectSocket, EVENTS } from '../services/socketService';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

// ── Pasos del flujo ───────────────────────────────────────
export const PASOS = {
  MESA:          'mesa',
  PRODUCTOS:     'productos',
  CONFIRMACION:  'confirmacion',
  ENVIADO:       'enviado',
};

const ORDEN_PASOS = [PASOS.MESA, PASOS.PRODUCTOS, PASOS.CONFIRMACION, PASOS.ENVIADO];

function authHeaders(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

// ── API calls ─────────────────────────────────────────────
async function fetchMesas(token) {
  const r = await fetch(`${API_BASE}/mesas`, { headers: authHeaders(token) });
  if (!r.ok) throw new Error('Error al cargar mesas');
  return r.json();
}

async function fetchProductos(token) {
  const r = await fetch(`${API_BASE}/productos?disponible=true`, { headers: authHeaders(token) });
  if (!r.ok) throw new Error('Error al cargar productos');
  const data = await r.json();
  return data.map(p => ({
    ...p,
    id_producto: Number(p.id_producto),
    precio: Number(p.precio),
  }));
}

async function fetchPedidosMesero(token, id_mesero) {
  const r = await fetch(`${API_BASE}/pedidos/mesero/${id_mesero}`, { headers: authHeaders(token) });
  if (!r.ok) throw new Error('Error al cargar pedidos');
  return r.json();
}

async function postPedido(token, payload) {
  const r = await fetch(`${API_BASE}/pedidos`, {
    method:  'POST',
    headers: authHeaders(token),
    body:    JSON.stringify(payload),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.message ?? 'Error al crear pedido');
  return data;
}

async function patchEstado(token, id_pedido, estado) {
  const r = await fetch(`${API_BASE}/pedidos/${id_pedido}/estado`, {
    method:  'PATCH',
    headers: authHeaders(token),
    body:    JSON.stringify({ estado }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.message ?? 'Error al cambiar estado');
  return data;
}

// ── Constantes ────────────────────────────────────────────
const MAX_ITEMS_DISTINTOS = 15;
const MAX_UNIDADES_ITEM   = 20;

// ── Hook principal ────────────────────────────────────────
export function useMesero() {
  const { token, user } = useAuthStore();
  const queryClient     = useQueryClient();
  const id_mesero       = user?.id_mesero ?? user?.id;

  // Estado del flujo
  const [pasoActual,     setPasoActual]     = useState(PASOS.MESA);
  const [mesaActiva,     setMesaActivaRaw]  = useState(null);
  const [carrito,        setCarrito]         = useState([]);
  const [ultimoPedidoId, setUltimoPedidoId] = useState(null);
  const [connected,      setConnected]       = useState(false);

  // ── Queries ───────────────────────────────────────────
  const { data: mesas = [], isLoading: loadingMesas } = useQuery({
    queryKey: ['mesas'],
    queryFn:  () => fetchMesas(token),
    staleTime: 5 * 60 * 1000,
  });

  const { data: productos = [], isLoading: loadingProductos } = useQuery({
    queryKey: ['productos'],
    queryFn:  () => fetchProductos(token),
    staleTime: 5 * 60 * 1000,
  });

  const { data: pedidos = [], isLoading: loadingPedidos } = useQuery({
    queryKey: ['pedidos-mesero', id_mesero],
    queryFn:  () => fetchPedidosMesero(token, id_mesero),
    enabled:  !!id_mesero,
    refetchInterval: 30000,
  });

  // ── Mutation: crear pedido ────────────────────────────
  const crearPedidoMutation = useMutation({
    mutationFn: (payload) => postPedido(token, payload),
    onSuccess: (data) => {
      setUltimoPedidoId(data.id_pedido);
      setPasoActual(PASOS.ENVIADO);
      queryClient.invalidateQueries({ queryKey: ['pedidos-mesero', id_mesero] });
      toast.success(`Pedido #${data.id_pedido} enviado a cocina 🔥`, {
        duration: 4000,
        icon: '🍗',
      });
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  // ── Mutation: entregar pedido ─────────────────────────
  const entregarMutation = useMutation({
    mutationFn: (id_pedido) => patchEstado(token, id_pedido, 'ENTREGADO'),
    onSuccess: (_, id_pedido) => {
      queryClient.setQueryData(['pedidos-mesero', id_mesero], (prev) =>
        (prev ?? []).map(p => p.id_pedido === id_pedido ? { ...p, estado: 'ENTREGADO' } : p)
      );
      toast.success(`Pedido #${id_pedido} entregado ✓`);
    },
    onError: (err) => toast.error(err.message),
  });

  // ── Socket.io ─────────────────────────────────────────
  useEffect(() => {
    const socket = connectSocket(token);
    socket.on(EVENTS.CONNECTED,    () => setConnected(true));
    socket.on(EVENTS.DISCONNECTED, () => setConnected(false));
    socket.on(EVENTS.PEDIDO_ESTADO, ({ id_pedido, estado }) => {
      queryClient.setQueryData(['pedidos-mesero', id_mesero], (prev) =>
        (prev ?? []).map(p => p.id_pedido === id_pedido ? { ...p, estado } : p)
      );
      if (estado === 'LISTO') {
        toast.success(`🔔 Pedido #${id_pedido} listo para entregar`, { duration: 6000 });
      }
    });
    return () => disconnectSocket();
  }, [token, id_mesero, queryClient]);

  // ── Navegación por pasos ──────────────────────────────
  const setMesaActiva = useCallback((mesa) => {
    setMesaActivaRaw(mesa);
    if (mesa) {
      setPasoActual(PASOS.PRODUCTOS);
      setCarrito([]);
    }
  }, []);

  const irAPaso = useCallback((paso) => {
    const indexActual = ORDEN_PASOS.indexOf(pasoActual);
    const indexDestino = ORDEN_PASOS.indexOf(paso);
    // Solo permite ir hacia atrás o al siguiente paso lógico
    if (indexDestino <= indexActual || paso === PASOS.CONFIRMACION) {
      setPasoActual(paso);
    }
  }, [pasoActual]);

  const reiniciar = useCallback(() => {
    setMesaActivaRaw(null);
    setCarrito([]);
    setUltimoPedidoId(null);
    setPasoActual(PASOS.MESA);
  }, []);

  // ── Carrito ───────────────────────────────────────────
  const agregarProducto = useCallback((producto) => {
    setCarrito(prev => {
      const existe = prev.find(i => i.id_producto === producto.id_producto);
      if (existe && existe.cantidad >= MAX_UNIDADES_ITEM) {
        toast.error(`Máximo ${MAX_UNIDADES_ITEM} unidades de "${producto.nombre}"`);
        return prev;
      }
      if (!existe && prev.length >= MAX_ITEMS_DISTINTOS) {
        toast.error(`Máximo ${MAX_ITEMS_DISTINTOS} productos distintos`);
        return prev;
      }
      if (existe) {
        return prev.map(i =>
          i.id_producto === producto.id_producto
            ? { ...i, cantidad: i.cantidad + 1 }
            : i
        );
      }
      return [...prev, { ...producto, cantidad: 1, nota: '' }];
    });
  }, []);

  const quitarProducto = useCallback((id_producto) => {
    setCarrito(prev => {
      const item = prev.find(i => i.id_producto === id_producto);
      if (!item) return prev;
      if (item.cantidad === 1) return prev.filter(i => i.id_producto !== id_producto);
      return prev.map(i =>
        i.id_producto === id_producto ? { ...i, cantidad: i.cantidad - 1 } : i
      );
    });
  }, []);

  const eliminarProducto = useCallback((id_producto) => {
    setCarrito(prev => prev.filter(i => i.id_producto !== id_producto));
  }, []);

  const cambiarNota = useCallback((id_producto, nota) => {
    if (nota.length > 100) return;
    setCarrito(prev =>
      prev.map(i => i.id_producto === id_producto ? { ...i, nota } : i)
    );
  }, []);

  const vaciarCarrito = useCallback(() => setCarrito([]), []);

  // ── Enviar pedido ─────────────────────────────────────
  const enviarPedido = useCallback(() => {
    if (!mesaActiva) { toast.error('Selecciona una mesa.'); return; }
    if (carrito.length === 0) { toast.error('Agrega al menos un producto.'); return; }

    crearPedidoMutation.mutate({
      id_mesa:   mesaActiva.id_mesa,
      id_mesero,
      items: carrito.map(i => ({
        id_producto: i.id_producto,
        cantidad:    i.cantidad,
        nota:        i.nota?.trim() || null,
      })),
    });
  }, [mesaActiva, carrito, id_mesero, crearPedidoMutation]);

  const irAConfirmar = useCallback(() => {
    if (carrito.length === 0) {
      toast.error('Agrega productos antes de confirmar.');
      return;
    }
    setPasoActual(PASOS.CONFIRMACION);
  }, [carrito]);

  // ── Agrupaciones ─────────────────────────────────────
  const mesasPorPiso = mesas.reduce((acc, m) => {
    const k = `Piso ${m.piso}`;
    acc[k] = acc[k] ? [...acc[k], m] : [m];
    return acc;
  }, {});

  const productosPorCategoria = productos.reduce((acc, p) => {
    const k = p.categoria ?? 'General';
    acc[k] = acc[k] ? [...acc[k], p] : [p];
    return acc;
  }, {});

  const total = carrito.reduce((acc, i) => acc + i.precio * i.cantidad, 0);
  const totalItems = carrito.reduce((acc, i) => acc + i.cantidad, 0);
  const loading = loadingMesas || loadingProductos || loadingPedidos;

  return {
    // Estado del flujo
    pasoActual, setPasoActual, irAPaso, reiniciar,
    // Mesa
    mesasPorPiso, mesaActiva, setMesaActiva,
    // Productos
    productosPorCategoria,
    // Carrito
    carrito, agregarProducto, quitarProducto, eliminarProducto,
    cambiarNota, vaciarCarrito, total, totalItems,
    // Pedidos
    pedidos, entregarPedido: (id) => entregarMutation.mutate(id),
    enviarPedido, irAConfirmar,
    enviando: crearPedidoMutation.isPending,
    ultimoPedidoId,
    // Estado
    loading, connected,
  };
}
