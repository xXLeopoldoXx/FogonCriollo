// ============================================================
// El Fogón Criollo – useMesero Hook
// Lógica completa del panel de mesero
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMesas, getProductos, crearPedido, getPedidosMesero } from '../services/pedidoService';
import { connectSocket, disconnectSocket, EVENTS } from '../services/socketService';

export function useMesero() {
  const { token, user } = useAuth();

  const [mesas,      setMesas]      = useState([]);
  const [productos,  setProductos]  = useState([]);
  const [pedidos,    setPedidos]    = useState([]);
  const [mesaActiva, setMesaActiva] = useState(null);
  const [carrito,    setCarrito]    = useState([]); // [{ id_producto, nombre, precio, cantidad }]
  const [loading,    setLoading]    = useState(true);
  const [enviando,   setEnviando]   = useState(false);
  const [error,      setError]      = useState('');
  const [exito,      setExito]      = useState('');
  const [connected,  setConnected]  = useState(false);

  // Carga inicial
  useEffect(() => {
    async function init() {
      try {
        const [m, p, pd] = await Promise.all([
          getMesas(token),
          getProductos(token),
          getPedidosMesero(token, user.id),
        ]);
        setMesas(m);
        setProductos(p);
        setPedidos(pd);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [token, user.id]);

  // Socket.io — escuchar actualizaciones de estado desde cocina
  useEffect(() => {
    const socket = connectSocket(token);

    socket.on(EVENTS.CONNECTED, () => setConnected(true));
    socket.on(EVENTS.DISCONNECTED, () => setConnected(false));

    // Cocina cambió el estado de un pedido → actualizar lista
    socket.on(EVENTS.PEDIDO_ESTADO, ({ id_pedido, estado }) => {
      setPedidos(prev =>
        prev.map(p => p.id_pedido === id_pedido ? { ...p, estado } : p)
      );
    });

    return () => disconnectSocket();
  }, [token]);

  // Carrito: agregar producto
  const agregarProducto = useCallback((producto) => {
    setCarrito(prev => {
      const existe = prev.find(i => i.id_producto === producto.id_producto);
      if (existe) {
        return prev.map(i =>
          i.id_producto === producto.id_producto
            ? { ...i, cantidad: i.cantidad + 1 }
            : i
        );
      }
      return [...prev, { ...producto, cantidad: 1 }];
    });
  }, []);

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

  // Carrito: eliminar item completo
  const eliminarProducto = useCallback((id_producto) => {
    setCarrito(prev => prev.filter(i => i.id_producto !== id_producto));
  }, []);

  // Total del carrito
  const total = carrito.reduce((acc, i) => acc + i.precio * i.cantidad, 0);

  // Enviar pedido
  const enviarPedido = useCallback(async () => {
    if (!mesaActiva) { setError('Selecciona una mesa primero.'); return; }
    if (carrito.length === 0) { setError('Agrega al menos un producto.'); return; }

    setEnviando(true);
    setError('');
    try {
      const { id_pedido } = await crearPedido({
        token,
        id_mesa:   mesaActiva.id_mesa,
        id_mesero: user.id_mesero,
        items:     carrito.map(i => ({ id_producto: i.id_producto, cantidad: i.cantidad })),
      });

      // Actualizar lista local de pedidos
      setPedidos(prev => [{
        id_pedido,
        fecha_hora:  new Date().toISOString(),
        estado:      'PENDIENTE',
        numero_mesa: mesaActiva.numero,
        piso:        mesaActiva.piso,
        total,
      }, ...prev]);

      setCarrito([]);
      setMesaActiva(null);
      setExito(`Pedido #${id_pedido} enviado a cocina`);
      setTimeout(() => setExito(''), 3500);
    } catch (e) {
      setError(e.message);
    } finally {
      setEnviando(false);
    }
  }, [mesaActiva, carrito, token, user.id, total]);

  // Agrupar mesas por piso
  const mesasPorPiso = mesas.reduce((acc, m) => {
    const k = `Piso ${m.piso}`;
    acc[k] = acc[k] ? [...acc[k], m] : [m];
    return acc;
  }, {});

  // Agrupar productos por categoría
  const productosPorCategoria = productos.reduce((acc, p) => {
    const k = p.categoria ?? 'General';
    acc[k] = acc[k] ? [...acc[k], p] : [p];
    return acc;
  }, {});

  return {
    mesas, mesasPorPiso, mesaActiva, setMesaActiva,
    productosPorCategoria,
    carrito, agregarProducto, quitarProducto, eliminarProducto, total,
    pedidos,
    enviarPedido, enviando,
    loading, error, exito, connected,
  };
}
