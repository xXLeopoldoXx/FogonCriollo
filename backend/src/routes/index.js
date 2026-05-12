// ============================================================
// El Fogón Criollo – routes/index.js
// Centraliza todas las rutas de la API
// ============================================================


const router = require('express').Router();
const { authMiddleware, requireRol } = require('../middleware/auth');

const authCtrl   = require('../controllers/authController');
const pedidoCtrl = require('../controllers/pedidoController');
const adminCtrl  = require('../controllers/adminController');

// ── Auth ─────────────────────────────────────────────────
router.post('/auth/login',  authCtrl.login);
router.post('/auth/logout', authMiddleware, authCtrl.logout);

// ── Mesas y productos ────────────────────────────────────
router.get('/mesas',     authMiddleware, pedidoCtrl.getMesas);
router.get('/productos', authMiddleware, pedidoCtrl.getProductos);

// ── Pedidos ──────────────────────────────────────────────
router.post  ('/pedidos',
              authMiddleware, requireRol('MESERO'),
              pedidoCtrl.crearPedido);

router.get   ('/pedidos/cocina',
              authMiddleware, requireRol('COCINERO', 'ADMIN'),
              pedidoCtrl.getPedidosCocina);

router.get   ('/pedidos/mesero/:id_mesero',
              authMiddleware, requireRol('MESERO', 'ADMIN'),
              pedidoCtrl.getPedidosMesero);

router.patch ('/pedidos/:id/estado',
              authMiddleware, requireRol('COCINERO', 'ADMIN'),
              pedidoCtrl.cambiarEstado);

// ── Vista pública del cliente (sin autenticación) ────────
router.get('/pedidos/cliente/espera', pedidoCtrl.getClienteEspera);
// Devuelve: estado, mesa, ítems con notas — sin datos sensibles
router.get('/pedidos/:id/cliente', pedidoCtrl.getClientePedido);

// ── Admin ────────────────────────────────────────────────
router.get('/admin/resumen-hoy',     authMiddleware, requireRol('ADMIN'), adminCtrl.getResumenHoy);
router.get('/admin/top-productos',   authMiddleware, requireRol('ADMIN'), adminCtrl.getTopProductos);
router.get('/admin/ventas',          authMiddleware, requireRol('ADMIN'), adminCtrl.getReporteVentas);
router.get('/admin/auditoria',       authMiddleware, requireRol('ADMIN'), adminCtrl.getAuditoria);
router.get('/admin/ventas-por-hora', authMiddleware, requireRol('ADMIN'), adminCtrl.getVentasPorHora);
router.get('/admin/categorias',      authMiddleware, requireRol('ADMIN'), pedidoCtrl.getCategorias);
router.get('/admin/productos',       authMiddleware, requireRol('ADMIN'), pedidoCtrl.getAdminProductos);
router.post('/admin/productos',      authMiddleware, requireRol('ADMIN'), pedidoCtrl.crearProducto);
router.put('/admin/productos/:id',   authMiddleware, requireRol('ADMIN'), pedidoCtrl.actualizarProducto);
router.delete('/admin/productos/:id', authMiddleware, requireRol('ADMIN'), pedidoCtrl.eliminarProducto);

module.exports = router;