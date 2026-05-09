// ============================================================
// El Fogón Criollo – useAdmin Hook
// Lógica completa del panel de administrador
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getResumenHoy, getTopProductos,
  getReporteVentas, getAuditoria, getVentasPorHora,
} from '../services/adminService';
import { connectSocket, disconnectSocket, EVENTS } from '../services/socketService';

function hoy() {
  return new Date().toISOString().split('T')[0];
}

function inicioMes() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export function useAdmin() {
  const { token } = useAuth();

  const [resumen,       setResumen]       = useState(null);
  const [topProductos,  setTopProductos]  = useState([]);
  const [ventasDiarias, setVentasDiarias] = useState([]);
  const [ventasPorHora, setVentasPorHora] = useState([]);
  const [auditoria,     setAuditoria]     = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [connected,     setConnected]     = useState(false);
  const [seccion,       setSeccion]       = useState('dashboard'); // dashboard | reportes | auditoria

  // Carga inicial de todos los datos
  useEffect(() => {
    async function init() {
      try {
        const [res, top, ventas, horas, aud] = await Promise.all([
          getResumenHoy(token),
          getTopProductos(token, 8),
          getReporteVentas(token, inicioMes(), hoy()),
          getVentasPorHora(token),
          getAuditoria(token, 50),
        ]);
        setResumen(res);
        setTopProductos(top);
        setVentasDiarias(ventas);
        setVentasPorHora(horas);
        setAuditoria(aud);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [token]);

  // Socket: actualizar resumen en tiempo real cuando hay pedidos nuevos
  useEffect(() => {
    const socket = connectSocket(token);
    socket.on(EVENTS.CONNECTED,    () => setConnected(true));
    socket.on(EVENTS.DISCONNECTED, () => setConnected(false));

    // Refrescar resumen del día cuando llega un pedido nuevo o cambia estado
    const refresh = async () => {
      try {
        const res = await getResumenHoy(token);
        setResumen(res);
      } catch {}
    };

    socket.on(EVENTS.PEDIDO_NUEVO,  refresh);
    socket.on(EVENTS.PEDIDO_ESTADO, refresh);

    return () => disconnectSocket();
  }, [token]);

  // Refrescar reporte de ventas con rango personalizado
  const refrescarVentas = useCallback(async (desde, hasta) => {
    try {
      const ventas = await getReporteVentas(token, desde, hasta);
      setVentasDiarias(ventas);
    } catch (e) {
      setError(e.message);
    }
  }, [token]);

  return {
    resumen, topProductos, ventasDiarias, ventasPorHora, auditoria,
    loading, error, connected,
    seccion, setSeccion,
    refrescarVentas,
  };
}
