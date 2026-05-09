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

// ── Mesas y productos (mesero y cocina) ──────────────────
router.get('/mesas',     authMiddleware, pedidoCtrl.getMesas);
router.get('/productos', authMiddleware, pedidoCtrl.getProductos);

// ── Pedidos ──────────────────────────────────────────────
router.post  ('/pedidos',                authMiddleware, requireRol('MESERO'),        pedidoCtrl.crearPedido);
router.get   ('/pedidos/cocina',         authMiddleware, requireRol('COCINERO', 'ADMIN'), pedidoCtrl.getPedidosCocina);
router.get   ('/pedidos/mesero/:id_mesero', authMiddleware, requireRol('MESERO', 'ADMIN'), pedidoCtrl.getPedidosMesero);
router.patch ('/pedidos/:id/estado',     authMiddleware, requireRol('COCINERO', 'ADMIN'),    pedidoCtrl.cambiarEstado);

// ── Admin ────────────────────────────────────────────────
router.get('/admin/resumen-hoy',    authMiddleware, requireRol('ADMIN'), adminCtrl.getResumenHoy);
router.get('/admin/top-productos',  authMiddleware, requireRol('ADMIN'), adminCtrl.getTopProductos);
router.get('/admin/ventas',         authMiddleware, requireRol('ADMIN'), adminCtrl.getReporteVentas);
router.get('/admin/auditoria',      authMiddleware, requireRol('ADMIN'), adminCtrl.getAuditoria);
router.get('/admin/ventas-por-hora',authMiddleware, requireRol('ADMIN'), adminCtrl.getVentasPorHora);

module.exports = router;
