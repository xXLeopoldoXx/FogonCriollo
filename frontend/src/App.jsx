// ============================================================
//  El Fogón Criollo — App.jsx v2
//  Router + React Query + AuthGuard + Providers
// ============================================================

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './stores/authStore';
import { LoginPage }   from './pages/LoginPage';
import { MeseroPage }  from './pages/MeseroPage';
import { CocinaPage }  from './pages/CocinaPage';
import { AdminPage }   from './pages/AdminPage';
import { ClientePage } from './pages/ClientePage';
import './styles/global.css';

// React Query client con configuración global
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:            60_000,        // 1 min
      gcTime:               5 * 60_000,    // 5 min
      retry:                2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

// ── Guard de autenticación y rol ─────────────────────────
function PrivateRoute({ children, roles }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user?.rol)) return <Navigate to="/login" replace />;
  return children;
}

// ── Redirect inteligente desde "/" ───────────────────────
function HomeRedirect() {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/cliente" replace />;
  const routes = { MESERO: '/mesero', COCINERO: '/cocina', ADMIN: '/admin' };
  return <Navigate to={routes[user?.rol] ?? '/cliente'} replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* ── Pública: vista cliente ─────────────── */}
          <Route path="/cliente"           element={<ClientePage />} />
          <Route path="/cliente/:idPedido" element={<ClientePage />} />

          {/* ── Auth ───────────────────────────────── */}
          <Route path="/login" element={<LoginPage />} />

          {/* ── Mesero ─────────────────────────────── */}
          <Route path="/mesero" element={
            <PrivateRoute roles={['MESERO']}>
              <MeseroPage />
            </PrivateRoute>
          } />

          {/* ── Cocina ─────────────────────────────── */}
          <Route path="/cocina" element={
            <PrivateRoute roles={['COCINERO']}>
              <CocinaPage />
            </PrivateRoute>
          } />

          {/* ── Admin ──────────────────────────────── */}
          <Route path="/admin" element={
            <PrivateRoute roles={['ADMIN']}>
              <AdminPage />
            </PrivateRoute>
          } />

          {/* ── Raíz ───────────────────────────────── */}
          <Route path="/"  element={<HomeRedirect />} />
          <Route path="*"  element={<Navigate to="/cliente" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
