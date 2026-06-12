// ============================================================
//  El Fogón Criollo — routes/index.js v2
//  Rutas con validación Zod, rate limiting, y exportaciones
// ============================================================

const router = require('express').Router();
const rateLimit = require('express-rate-limit');

const { authMiddleware, requireRol, userRateLimit } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');

const authCtrl    = require('../controllers/authController');
const pedidoCtrl  = require('../controllers/pedidoController');
const adminCtrl   = require('../controllers/adminController');
const exportCtrl  = require('../controllers/exportController');
const mesaCtrl    = require('../controllers/mesaController');

// ── Rate limiters ─────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.LOGIN_RATE_LIMIT_MAX) || 10,
  message: { message: 'Demasiados intentos de login. Espera 1 minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 100,
  message: { message: 'Demasiadas solicitudes. Espera un momento.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'GET',
});

router.use(apiLimiter);

// ── Auth ──────────────────────────────────────────────────
router.post('/auth/login',
  loginLimiter,
  validate(schemas.loginSchema),
  authCtrl.login,
);
router.post('/auth/logout',
  authMiddleware,
  authCtrl.logout,
);
router.get('/auth/me',
  authMiddleware,
  authCtrl.me,
);

// ── Mesas ──────────────────────────────────────────────────
router.get('/mesas',
  authMiddleware,
  mesaCtrl.getMesas,
);
router.get('/mesas/:id/pedidos-activos',
  authMiddleware,
  requireRol('MESERO', 'ADMIN'),
  mesaCtrl.getPedidosActivosMesa,
);

// ── Productos ─────────────────────────────────────────────
router.get('/productos',
  authMiddleware,
  pedidoCtrl.getProductos,
);

// ── Pedidos ───────────────────────────────────────────────
router.post('/pedidos',
  authMiddleware,
  requireRol('MESERO'),
  validate(schemas.crearPedidoSchema),
  pedidoCtrl.crearPedido,
);

router.get('/pedidos/cocina',
  authMiddleware,
  requireRol('COCINERO', 'ADMIN'),
  pedidoCtrl.getPedidosCocina,
);

router.get('/pedidos/mesero/:id_mesero',
  authMiddleware,
  requireRol('MESERO', 'ADMIN'),
  pedidoCtrl.getPedidosMesero,
);

router.patch('/pedidos/:id/estado',
  authMiddleware,
  requireRol('COCINERO', 'ADMIN', 'MESERO'),
  validate(schemas.cambiarEstadoSchema),
  pedidoCtrl.cambiarEstado,
);

// ── Vistas públicas del cliente (sin auth) ────────────────
router.get('/pedidos/cliente/espera', pedidoCtrl.getClienteEspera);
router.get('/pedidos/:id/cliente',    pedidoCtrl.getClientePedido);

// ── Admin — Dashboard ─────────────────────────────────────
router.get('/admin/resumen-hoy',
  authMiddleware, requireRol('ADMIN'),
  adminCtrl.getResumenHoy,
);
router.get('/admin/top-productos',
  authMiddleware, requireRol('ADMIN'),
  adminCtrl.getTopProductos,
);
router.get('/admin/ventas',
  authMiddleware, requireRol('ADMIN'),
  validate(schemas.reporteVentasSchema, 'query'),
  adminCtrl.getReporteVentas,
);
router.get('/admin/auditoria',
  authMiddleware, requireRol('ADMIN'),
  adminCtrl.getAuditoria,
);
router.get('/admin/ventas-por-hora',
  authMiddleware, requireRol('ADMIN'),
  adminCtrl.getVentasPorHora,
);
router.get('/admin/actividad-usuarios',
  authMiddleware, requireRol('ADMIN'),
  adminCtrl.getActividadUsuarios,
);
router.get('/admin/mesas-rendimiento',
  authMiddleware, requireRol('ADMIN'),
  adminCtrl.getMesasRendimiento,
);
router.get('/admin/notificaciones',
  authMiddleware, requireRol('ADMIN'),
  adminCtrl.getNotificaciones,
);

// ── Admin — CRUD Productos ────────────────────────────────
router.get('/admin/categorias',
  authMiddleware, requireRol('ADMIN'),
  pedidoCtrl.getCategorias,
);
router.get('/admin/productos',
  authMiddleware, requireRol('ADMIN'),
  pedidoCtrl.getAdminProductos,
);
router.post('/admin/productos',
  authMiddleware, requireRol('ADMIN'),
  validate(schemas.productoSchema),
  pedidoCtrl.crearProducto,
);
router.put('/admin/productos/:id',
  authMiddleware, requireRol('ADMIN'),
  validate(schemas.productoSchema),
  pedidoCtrl.actualizarProducto,
);
router.delete('/admin/productos/:id',
  authMiddleware, requireRol('ADMIN'),
  pedidoCtrl.eliminarProducto,
);

// ── Exportaciones ─────────────────────────────────────────
router.get('/admin/export/ventas/xlsx',
  authMiddleware, requireRol('ADMIN'),
  exportCtrl.exportarVentasExcel,
);
router.get('/admin/export/ventas/pdf',
  authMiddleware, requireRol('ADMIN'),
  exportCtrl.exportarVentasPDF,
);
router.get('/admin/export/productos/xlsx',
  authMiddleware, requireRol('ADMIN'),
  exportCtrl.exportarProductosExcel,
);
router.get('/admin/export/auditoria/xlsx',
  authMiddleware, requireRol('ADMIN'),
  exportCtrl.exportarAuditoriaExcel,
);

module.exports = router;
