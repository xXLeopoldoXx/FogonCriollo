import { createStore } from 'zustand/vanilla';
import {
  actualizarEstadoPedido,
  agregarPedidoActivo,
  puedeTransicionar,
} from '../models/pedidoStateMachine';

export function createCocinaStore() {
  return createStore((set, get) => ({
    pedidos: [],
    loading: false,
    error: null,
    setLoading: loading => set({ loading }),
    setError: error => set({ error }),
    setPedidos: pedidos => set({ pedidos, error: null }),
    agregarPedido: pedido => set(state => ({
      pedidos: agregarPedidoActivo(state.pedidos, pedido),
    })),
    avanzarEstado: (idPedido, nuevoEstado) => {
      const pedido = get().pedidos.find(p => p.id_pedido === idPedido);
      if (!pedido) return;
      if (!puedeTransicionar(pedido.estado, nuevoEstado)) {
        set({ error: `Transición inválida: ${pedido.estado} -> ${nuevoEstado}` });
        return;
      }
      set(state => ({
        pedidos: actualizarEstadoPedido(state.pedidos, idPedido, nuevoEstado),
        error: null,
      }));
    },
  }));
}

export const cocinaStore = createCocinaStore();
