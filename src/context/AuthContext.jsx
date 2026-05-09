// ============================================================
// El Fogón Criollo – AuthContext
// Estado global de autenticación disponible en toda la app
// ============================================================

import { createContext, useContext, useState, useEffect } from 'react';
import { getStoredSession, logout as apiLogout } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,  setUser]  = useState(null);
  const [token, setToken] = useState(null);
  const [ready, setReady] = useState(false); // evita flash antes de rehidratar

  // Rehidratar sesión al montar (F5 / nueva pestaña)
  useEffect(() => {
    const session = getStoredSession();
    if (session) {
      setUser(session.user);
      setToken(session.token);
    }
    setReady(true);
  }, []);

  function signIn({ token, usuario }) {
    setToken(token);
    setUser(usuario);
  }

  async function signOut() {
    await apiLogout();
    setToken(null);
    setUser(null);
  }

  const value = {
    user,
    token,
    isAuthenticated: !!user,
    signIn,
    signOut,
  };

  if (!ready) return null; // espera rehidratación antes de renderizar

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook de consumo
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
