// ============================================================
// El Fogón Criollo – App.jsx
// Router principal + providers globales
// ============================================================

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import './styles/global.css';

/* Rutas protegidas por autenticación */
function PrivateRoute({ children, roles }) {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user?.rol)) return <Navigate to="/login" replace />;
  return children;
}

/* Placeholders de páginas — se irán construyendo */
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
          <Route path="/login" element={<LoginPage />} />

          <Route path="/mesero" element={
            <PrivateRoute roles={['MESERO']}>
              <PlaceholderPage title="Panel Mesero" />
            </PrivateRoute>
          } />

          <Route path="/cocina" element={
            <PrivateRoute roles={['COCINA']}>
              <PlaceholderPage title="Panel Cocina" />
            </PrivateRoute>
          } />

          <Route path="/admin" element={
            <PrivateRoute roles={['ADMINISTRADOR']}>
              <PlaceholderPage title="Panel Admin" />
            </PrivateRoute>
          } />

          {/* Redirige raíz a login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
