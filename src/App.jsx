//router de llamada a las páginas, con protección de rutas según rol de usuario

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage }   from './pages/LoginPage';
import { MeseroPage }  from './pages/MeseroPage';
import { CocinaPage }  from './pages/CocinaPage';
import { AdminPage }   from './pages/AdminPage';
import { ClientePage } from './pages/ClientePage';
import './styles/global.css';

// Rutas protegidas por autenticación y rol 
function PrivateRoute({ children, roles }) {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user?.rol)) return <Navigate to="/login" replace />;
  return children;
}

const PlaceholderPage = ({ title }) => (
  <div style={{ padding: 40, color: 'var(--text-cream)', fontFamily: 'var(--font-body)' }}>
    <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--brand-glow)' }}>{title}</h2>
    <p style={{ color: 'var(--text-dim)', marginTop: 8 }}>En construcción...</p>
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Pública – vista del cliente (sin login) */}
          <Route path="/cliente" element={<ClientePage />} />
          <Route path="/cliente/:idPedido" element={<ClientePage />} />

          <Route path="/login" element={<LoginPage />} />

          <Route path="/mesero" element={
            <PrivateRoute roles={['MESERO']}>
              <MeseroPage />
            </PrivateRoute>
          } />

          <Route path="/cocina" element={
            <PrivateRoute roles={['COCINERO']}>
              <CocinaPage />
            </PrivateRoute>
          } />

          <Route path="/admin" element={
            <PrivateRoute roles={['ADMIN']}>
              <AdminPage />
            </PrivateRoute>
          } />

          <Route path="/" element={<Navigate to="/cliente" replace />} />
          <Route path="*" element={<Navigate to="/cliente" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
