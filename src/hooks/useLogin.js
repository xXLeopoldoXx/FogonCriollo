import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, storeSession } from '../services/authService';
import { useAuth } from '../context/AuthContext';

const ROLE_ROUTES = {
  MESERO:   '/mesero',
  COCINERO: '/cocina',
  ADMIN:    '/admin',
};

export function useLogin() {
  const { signIn }   = useAuth();
  const navigate     = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  async function handleLogin({ username, password, rol }) {
    setError('');
    if (!username.trim() || !password.trim()) {
      setError('Por favor completa todos los campos.');
      return;
    }
    setLoading(true);
    try {
      const data = await login({ username, password, rol });
      storeSession(data);
      signIn(data);
      navigate(ROLE_ROUTES[data.usuario.rol] ?? '/');
    } catch (err) {
      setError(err.message ?? 'Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  }

  return { handleLogin, loading, error };
}