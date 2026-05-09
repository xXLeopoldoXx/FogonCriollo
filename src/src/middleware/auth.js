// ============================================================
// El Fogón Criollo – middleware/auth.js
// Verifica JWT en cada ruta protegida
// ============================================================

const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const header = req.headers.authorization ?? '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Token requerido' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, username, rol }
    next();
  } catch {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
}

// Middleware de roles: solo permite ciertos roles
function requireRol(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.rol)) {
      return res.status(403).json({ message: 'Acceso no autorizado' });
    }
    next();
  };
}

module.exports = { authMiddleware, requireRol };
