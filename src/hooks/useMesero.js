
// El Fogón Criollo – useMesero Hook
// Lógica completa del panel de mesero

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getMesas, getProductos, crearPedido, getPedidosMesero, cambiarEstadoPedido,
} from '../services/pedidoService';
import { connectSocket, disconnectSocket, EVENTS } from '../services/socketService';

//Constantes de validación
const MAX_ITEMS_DISTINTOS = 15;
const MAX_UNIDADES_ITEM   = 20;
const TOAST_DURATION_MS   = 3500;

// Toast queue helper
function makeToast(message, type = 'success') {
  return { id: Date.now() + Math.random(), message, type };
}

function toMoney(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeProducto(producto) {
  return {
    ...producto,
    id_producto: Number(producto.id_producto),
    precio: toMoney(producto.precio),
  };
}

export function useMesero() {
  const { token, user } = useAuth();

  const [mesas,      setMesas]      = useState([]);
  const [productos,  setProductos]  = useState([]);
  const [pedidos,    setPedidos]    = useState([]);
  const [mesaActiva, setMesaActiva] = useState(null);
  const [carrito,    setCarrito]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [enviando,   setEnviando]   = useState(false);
  const [toasts,     setToasts]     = useState([]);      // [{ id, message, type }]
  const [connected,  setConnected]  = useState(false);
  const [ultimoPedidoId, setUltimoPedidoId] = useState(null);

  // Helpers de toast
  const pushToast = useCallback((message, type = 'success') => {
    const t = makeToast(message, type);
    setToasts(prev => [...prev, t]);
    setTimeout(() => {
      setToasts(prev => prev.filter(x => x.id !== t.id));
    }, TOAST_DURATION_MS);
  }, []);

  const pushError   = useCallback((msg) => pushToast(msg,     'error'),   [pushToast]);
  const pushSuccess = useCallback((msg) => pushToast(msg,     'success'), [pushToast]);
  const pushWarning = useCallback((msg) => pushToast(msg,     'warning'), [pushToast]);

  // Carga inicial
  useEffect(() => {
    if (!token || !user?.id) return;

    async function init() {
      const idMesero = user.id_mesero ?? user.id;
      try {
        const [m, p, pd] = await Promise.all([
          getMesas(token),
          getProductos(token),
          getPedidosMesero(token, idMesero),
        ]);
        setMesas(m);
        setProductos(p.map(normalizeProducto));
        setPedidos(pd);
      } catch (e) {
        pushError(`Error al cargar datos: ${e.message}`);
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [token, user?.id, user?.id_mesero, pushError]);

  // Socket.io
  useEffect(() => {
    const socket = connectSocket(token);

    socket.on(EVENTS.CONNECTED,    () => setConnected(true));
    socket.on(EVENTS.DISCONNECTED, () => setConnected(false));

    socket.on(EVENTS.PEDIDO_ESTADO, ({ id_pedido, estado }) => {
      setPedidos(prev =>
        prev.map(p => p.id_pedido === id_pedido ? { ...p, estado } : p)
      );

      // Notificación cuando el pedido está listo
      if (estado === 'LISTO') {
        pushSuccess(`🔔 Pedido #${id_pedido} está listo para entregar`);
      }
    });

    return () => disconnectSocket();
  }, [token, pushSuccess]);

  // Carrito: agregar producto 
  const agregarProducto = useCallback((producto) => {
    const productoSeguro = normalizeProducto(producto);
    setCarrito(prev => {
      const existe = prev.find(i => i.id_producto === productoSeguro.id_producto);

      // Validar límite de unidades
      if (existe && existe.cantidad >= MAX_UNIDADES_ITEM) {
        pushWarning(`Máximo ${MAX_UNIDADES_ITEM} unidades de "${productoSeguro.nombre}"`);
        return prev;
      }

      // Validar límite de ítems distintos
      if (!existe && prev.length >= MAX_ITEMS_DISTINTOS) {
        pushWarning(`Máximo ${MAX_ITEMS_DISTINTOS} productos distintos por pedido`);
        return prev;
      }

      if (existe) {
        return prev.map(i =>
          i.id_producto === productoSeguro.id_producto
            ? { ...i, cantidad: i.cantidad + 1 }
            : i
        );
      }
      return [...prev, { ...productoSeguro, cantidad: 1, nota: '' }];
    });
  }, [pushWarning]);

  // Carrito: quitar una unidad 
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

  // Carrito: eliminar ítem completo
  const eliminarProducto = useCallback((id_producto) => {
    setCarrito(prev => prev.filter(i => i.id_producto !== id_producto));
  }, []);

  // Carrito: modificar nota de un ítem
  const cambiarNota = useCallback((id_producto, nota) => {
    if (nota.length > 100) return; // guardado silencioso del límite
    setCarrito(prev =>
      prev.map(i => i.id_producto === id_producto ? { ...i, nota } : i)
    );
  }, []);

  // Total del carrito
  const total = carrito.reduce((acc, i) => acc + toMoney(i.precio) * Number(i.cantidad), 0);

  // Validación completa antes de enviar
  function validarPedido() {
    if (!mesaActiva)       { pushError('Selecciona una mesa primero.'); return false; }
    if (carrito.length === 0) { pushError('Agrega al menos un producto.'); return false; }
    if (total <= 0)        { pushError('El total del pedido no es válido.'); return false; }

    // Validar que todos los precios sean números positivos
    const precioInvalido = carrito.find(i => !Number.isFinite(toMoney(i.precio)) || toMoney(i.precio) <= 0);
    if (precioInvalido) {
      pushError(`Precio inválido para "${precioInvalido.nombre}"`);
      return false;
    }

    return true;
  }

  // Enviar pedido
  const enviarPedido = useCallback(async () => {
    if (!validarPedido()) return;

    setEnviando(true);
    try {
      const { id_pedido } = await crearPedido({
        token,
        id_mesa:   mesaActiva.id_mesa,
        id_mesero: user.id_mesero ?? user.id,
        items:     carrito.map(i => ({
          id_producto: i.id_producto,
          cantidad:    i.cantidad,
          nota:        i.nota?.trim() || null,
        })),
      });

      // Actualizar lista de pedidos local
      setPedidos(prev => [{
        id_pedido,
        fecha_hora:  new Date().toISOString(),
        estado:      'PENDIENTE',
        numero_mesa: mesaActiva.numero,
        piso:        mesaActiva.piso,
        total,
        items:       carrito.map(i => ({ producto: i.nombre, cantidad: i.cantidad, nota: i.nota })),
      }, ...prev]);

      setUltimoPedidoId(id_pedido);
      setCarrito([]);
      setMesaActiva(null);
      pushSuccess(`✅ Pedido #${id_pedido} enviado a cocina`);
    } catch (e) {
      pushError(e.message ?? 'Error al crear el pedido. Intenta nuevamente.');
    } finally {
      setEnviando(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesaActiva, carrito, token, user, total, pushError, pushSuccess]);

  const entregarPedido = useCallback(async (id_pedido) => {
    try {
      await cambiarEstadoPedido(token, id_pedido, 'ENTREGADO');
      setPedidos(prev => prev.map(p =>
        p.id_pedido === id_pedido ? { ...p, estado: 'ENTREGADO' } : p
      ));
      pushSuccess(`Pedido #${id_pedido} entregado`);
    } catch (e) {
      pushError(e.message ?? 'No se pudo marcar como entregado.');
    }
  }, [token, pushError, pushSuccess]);

  // Agrupaciones
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

  return {
    mesas, mesasPorPiso, mesaActiva, setMesaActiva,
    productosPorCategoria,
    carrito, agregarProducto, quitarProducto, eliminarProducto, cambiarNota, total,
    pedidos,
    entregarPedido,
    enviarPedido, enviando,
    ultimoPedidoId,
    loading, toasts, connected,
  };
}
