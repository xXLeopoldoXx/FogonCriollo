// ============================================================
//  El Fogón Criollo — middleware/auth.js
//  JWT auth + RBAC granular con cache Redis
// ============================================================

const jwt    = require('jsonwebtoken');
const { cache } = require('../db/redis');
const logger = require('../utils/logger');

// Blacklist de tokens revocados (logout)
const TOKEN_BLACKLIST_PREFIX = 'token:blacklist:';
const SESSION_PREFIX         = 'session:';

// ── Verificación JWT ──────────────────────────────────────
async function authMiddleware(req, res, next) {
  const header = req.headers.authorization ?? '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Token requerido.' });
  }

  try {
    // Verificar si el token está en la blacklist (logout)
    const isBlacklisted = await cache.get(`${TOKEN_BLACKLIST_PREFIX}${token.slice(-20)}`);
    if (isBlacklisted) {
      return res.status(401).json({ message: 'Sesión cerrada. Inicia sesión nuevamente.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user  = decoded;
    req.token = token;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Sesión expirada. Inicia sesión nuevamente.' });
    }
    return res.status(401).json({ message: 'Token inválido.' });
  }
}

// ── RBAC — control de roles ───────────────────────────────
function requireRol(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado.' });
    }
    if (!roles.includes(req.user.rol)) {
      logger.warn('Acceso denegado por rol', {
        user: req.user.username,
        rol:  req.user.rol,
        requerido: roles,
        url: req.url,
      });
      return res.status(403).json({
        message: `Acceso denegado. Rol requerido: ${roles.join(' o ')}.`,
      });
    }
    next();
  };
}

// ── Middleware opcional (no falla si no hay token) ────────
function optionalAuth(req, _res, next) {
  const header = req.headers.authorization ?? '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try {
      req.user  = jwt.verify(token, process.env.JWT_SECRET);
      req.token = token;
    } catch { /* sin auth — ok para rutas públicas */ }
  }
  next();
}

// ── Revocar token (logout) ────────────────────────────────
async function revokeToken(token) {
  if (!token) return;
  try {
    const decoded = jwt.decode(token);
    if (!decoded?.exp) return;
    const ttl = decoded.exp - Math.floor(Date.now() / 1000);
    if (ttl > 0) {
      await cache.set(`${TOKEN_BLACKLIST_PREFIX}${token.slice(-20)}`, true, ttl);
    }
  } catch { /* ignorar */ }
}

// ── Rate limiting por usuario ─────────────────────────────
function userRateLimit(maxRequests = 60, windowSeconds = 60) {
  return async (req, res, next) => {
    if (!req.user) return next();
    const key = `ratelimit:${req.user.id}:${Math.floor(Date.now() / (windowSeconds * 1000))}`;
    try {
      const count = await cache.get(key) || 0;
      if (count >= maxRequests) {
        return res.status(429).json({ message: 'Demasiadas solicitudes. Espera un momento.' });
      }
      // Incrementar contador
      const newCount = Number(count) + 1;
      await cache.set(key, newCount, windowSeconds);
    } catch { /* si Redis falla, permite la solicitud */ }
    next();
  };
}

module.exports = {
  authMiddleware,
  requireRol,
  optionalAuth,
  revokeToken,
  userRateLimit,
};
