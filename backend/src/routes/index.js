// routes/index.js — Registro central de rutas Kinventory
const router = require('express').Router();
const { body } = require('express-validator');
const { validar } = require('../middleware/validate');
const { autenticado, soloAdmin, adminOAlmacenista, requiereRol, auditar } = require('../middleware/auth');
const pool = require('../config/db');

// Controllers
const auth       = require('../controllers/authController');
const productos  = require('../controllers/productosController');
const ventas     = require('../controllers/ventasController');
const inventario = require('../controllers/inventarioController');
const facturas   = require('../controllers/facturasController');
const catalogos  = require('../controllers/catalogosController');
const reportes   = require('../controllers/reportesController');

// ── MANTENIMIENTO (temporal) ───────────────────────────────────
router.post('/maintenance/fix-views', async (req, res) => {
  if (req.headers['x-maintenance-key'] !== (process.env.MAINTENANCE_KEY || 'kinventory-fix-2024')) {
    return res.status(403).json({ ok: false, mensaje: 'Clave incorrecta.' });
  }
  try {
    await pool.query(`CREATE OR REPLACE VIEW v_productos_stock AS
      SELECT p.id_producto, p.id_empresa, p.codigo, p.nombre, p.precio_venta, p.precio_compra,
             p.stock_actual, p.stock_minimo, p.stock_maximo, p.aplica_iva,
             c.nombre AS categoria, pr.nombre AS proveedor, e.nombre AS empresa,
             CASE WHEN p.stock_actual = 0 THEN 'agotado'
                  WHEN p.stock_actual <= p.stock_minimo THEN 'critico'
                  WHEN p.stock_actual <= p.stock_minimo * 2 THEN 'bajo'
                  ELSE 'normal' END AS estado_stock
      FROM productos p
      JOIN categorias c ON p.id_categoria = c.id_categoria
      LEFT JOIN proveedores pr ON p.id_proveedor = pr.id_proveedor
      JOIN empresas e ON p.id_empresa = e.id_empresa
      WHERE p.activo = 1`);

    await pool.query(`CREATE OR REPLACE VIEW v_movimientos_completos AS
      SELECT m.id_movimiento, m.id_empresa, m.creado_en, m.tipo, m.cantidad,
             m.stock_anterior, m.stock_nuevo, m.costo_unitario, m.referencia, m.notas,
             p.nombre AS producto, p.codigo AS codigo_producto,
             u.nombre AS usuario, r.nombre AS rol_usuario,
             s.nombre AS sucursal, e.nombre AS empresa
      FROM movimientos_inventario m
      JOIN productos p  ON m.id_producto = p.id_producto
      JOIN usuarios u   ON m.id_usuario  = u.id_usuario
      JOIN roles r      ON u.id_rol      = r.id_rol
      JOIN sucursales s ON m.id_sucursal = s.id_sucursal
      JOIN empresas e   ON m.id_empresa  = e.id_empresa`);

    res.json({ ok: true, mensaje: 'Vistas corregidas exitosamente.' });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  }
});

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

router.get ('/proveedores',       autenticado, catalogos.getProveedores);
router.post('/proveedores',       autenticado, soloAdmin, catalogos.crearProveedor);
router.put ('/proveedores/:id',   autenticado, soloAdmin, catalogos.actualizarProveedor);
router.delete('/proveedores/:id', autenticado, soloAdmin, catalogos.eliminarProveedor);

router.get ('/clientes',          autenticado, requiereRol([1,2]), catalogos.getClientes);
router.post('/clientes',          autenticado, requiereRol([1,2]), catalogos.crearCliente);
router.put ('/clientes/:id',      autenticado, requiereRol([1,2]), catalogos.actualizarCliente);

router.get ('/usuarios',          autenticado, catalogos.getUsuarios);
router.get ('/roles',             autenticado, soloAdmin, catalogos.getRoles);
router.get ('/sucursales',        autenticado, catalogos.getSucursales);

// ── REPORTES (solo Admin) ─────────────────────────────────────
router.get('/reportes/auditoria',          autenticado, soloAdmin, reportes.auditoria);
router.get('/reportes/ventas-por-vendedor',autenticado, soloAdmin, reportes.ventasPorVendedor);
router.get('/reportes/exportar-inventario',autenticado, soloAdmin, reportes.exportarInventario);

module.exports = router;
