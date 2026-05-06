// routes/index.js — Registro central de rutas Kinventory
const router = require('express').Router();
const { body } = require('express-validator');
const { validar } = require('../middleware/validate');
const { autenticado, soloAdmin, adminOAlmacenista, requiereRol, auditar } = require('../middleware/auth');

// Controllers
const auth       = require('../controllers/authController');
const productos  = require('../controllers/productosController');
const ventas     = require('../controllers/ventasController');
const inventario = require('../controllers/inventarioController');
const facturas   = require('../controllers/facturasController');
const catalogos  = require('../controllers/catalogosController');
const reportes   = require('../controllers/reportesController');

// ── AUTH ──────────────────────────────────────────────────────
router.post('/auth/login',
  [body('correo').isEmail(), body('contrasena').notEmpty()], validar,
  auth.login
);
router.post('/auth/refresh',   auth.refreshToken);
router.get ('/auth/perfil',    autenticado, auth.perfil);
router.put ('/auth/contrasena', autenticado, auth.cambiarContrasena);
router.post('/auth/register',  autenticado, soloAdmin, auditar('CREATE_USER','usuarios'), auth.register);

// ── DASHBOARD ─────────────────────────────────────────────────
router.get('/dashboard/resumen',   autenticado, requiereRol([1,2]), ventas.resumenDashboard);
router.get('/dashboard/top-productos', autenticado, requiereRol([1]), ventas.masVendidos);
router.get('/dashboard/ventas-mes',    autenticado, requiereRol([1]), ventas.porMes);

// ── PRODUCTOS ─────────────────────────────────────────────────
router.get ('/productos',           autenticado, productos.listar);
router.get ('/productos/stock-bajo',autenticado, adminOAlmacenista, productos.stockBajo);
router.post('/productos/alerta-stock', autenticado, soloAdmin, productos.alertarStockBajo);
router.get ('/productos/:id',       autenticado, productos.obtener);
router.post('/productos',           autenticado, soloAdmin, auditar('CREATE','productos'), productos.crear);
router.put ('/productos/:id',       autenticado, soloAdmin, auditar('UPDATE','productos'), productos.actualizar);
router.delete('/productos/:id',     autenticado, soloAdmin, auditar('DELETE','productos'), productos.eliminar);

// ── VENTAS (Vendedor + Admin — NO Almacenista) ────────────────
router.get ('/ventas',          autenticado, requiereRol([1,2]), ventas.listar);
router.get ('/ventas/:id',      autenticado, requiereRol([1,2]), ventas.obtener);
router.post('/ventas',          autenticado, requiereRol([1,2]), auditar('CREATE','ventas'), ventas.crear);
router.patch('/ventas/:id/cancelar', autenticado, soloAdmin, auditar('CANCEL','ventas'), ventas.cancelar);

// ── INVENTARIO (Almacenista + Admin) ──────────────────────────
router.get ('/inventario/movimientos',  autenticado, adminOAlmacenista, inventario.listarMovimientos);
router.post('/inventario/movimiento',   autenticado, adminOAlmacenista, auditar('MOVIMIENTO','movimientos_inventario'), inventario.registrarMovimiento);
router.post('/inventario/ajuste',       autenticado, adminOAlmacenista, auditar('AJUSTE','productos'), inventario.ajustarStock);
router.get ('/inventario/resumen',      autenticado, adminOAlmacenista, inventario.resumenInventario);

// ── FACTURAS ──────────────────────────────────────────────────
router.get  ('/facturas/resumen',   autenticado, requiereRol([1]), facturas.resumen);
router.get  ('/facturas',           autenticado, requiereRol([1,2]), facturas.listar);
router.get  ('/facturas/:id',       autenticado, requiereRol([1,2]), facturas.obtener);
router.patch('/facturas/:id/estado',autenticado, soloAdmin, auditar('UPDATE_STATUS','facturas'), facturas.cambiarEstado);

// ── CATÁLOGOS ─────────────────────────────────────────────────
router.get ('/categorias',        autenticado, catalogos.getCategorias);
router.post('/categorias',        autenticado, soloAdmin, catalogos.crearCategoria);
router.put ('/categorias/:id',    autenticado, soloAdmin, catalogos.actualizarCategoria);
router.delete('/categorias/:id',  autenticado, soloAdmin, catalogos.eliminarCategoria);

router.get ('/proveedores',       autenticado, soloAdmin, catalogos.getProveedores);
router.post('/proveedores',       autenticado, soloAdmin, catalogos.crearProveedor);
router.put ('/proveedores/:id',   autenticado, soloAdmin, catalogos.actualizarProveedor);
router.delete('/proveedores/:id', autenticado, soloAdmin, catalogos.eliminarProveedor);

router.get ('/clientes',          autenticado, requiereRol([1,2]), catalogos.getClientes);
router.post('/clientes',          autenticado, requiereRol([1,2]), catalogos.crearCliente);
router.put ('/clientes/:id',      autenticado, requiereRol([1,2]), catalogos.actualizarCliente);

router.get ('/usuarios',          autenticado, soloAdmin, catalogos.getUsuarios);
router.get ('/roles',             autenticado, soloAdmin, catalogos.getRoles);
router.get ('/sucursales',        autenticado, catalogos.getSucursales);

// ── REPORTES (solo Admin) ─────────────────────────────────────
router.get('/reportes/auditoria',          autenticado, soloAdmin, reportes.auditoria);
router.get('/reportes/ventas-por-vendedor',autenticado, soloAdmin, reportes.ventasPorVendedor);
router.get('/reportes/exportar-inventario',autenticado, soloAdmin, reportes.exportarInventario);

module.exports = router;
