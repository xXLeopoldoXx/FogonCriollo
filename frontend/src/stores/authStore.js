// ============================================================
//  El Fogón Criollo — stores/authStore.js
//  Estado global de autenticación con Zustand
// ============================================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

const ROLE_ROUTES = {
  MESERO:   '/mesero',
  COCINERO: '/cocina',
  ADMIN:    '/admin',
};

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user:  null,
      token: null,
      isAuthenticated: false,

      signIn: ({ token, usuario }) => {
        set({
          token,
          user: usuario,
          isAuthenticated: true,
        });
      },

      signOut: async () => {
        const { token } = get();
        if (token) {
          // Fire-and-forget logout
          fetch(`${API_BASE}/auth/logout`, {
            method:  'POST',
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => {});
        }
        set({ token: null, user: null, isAuthenticated: false });
      },

      getRoute: () => {
        const { user } = get();
        return ROLE_ROUTES[user?.rol] ?? '/login';
      },

      // Actualizar datos de usuario (ej: nombre)
      updateUser: (updates) => {
        set(state => ({
          user: { ...state.user, ...updates },
        }));
      },
    }),
    {
      name:    'fogon-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
    }
  )
);

// Helpers de acceso directo
export const getToken = () => useAuthStore.getState().token;
export const getUser  = () => useAuthStore.getState().user;
