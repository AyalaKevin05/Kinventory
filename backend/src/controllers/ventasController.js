// controllers/ventasController.js
const pool = require('../config/db');
const { ok, creado, error, noEncontrado } = require('../utils/response');

const listar = async (req, res) => {
  try {
    const desde  = req.query.desde  || null;
    const hasta  = req.query.hasta  || null;
    const estado = req.query.estado || null;
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;
    const { id_empresa, id_sucursal, id_rol } = req.usuario;

    let where = 'WHERE v.id_empresa = ?';
    const params = [id_empresa];

    // Vendedor solo ve sus propias ventas
    if (id_rol === 2) { where += ' AND v.id_usuario = ?'; params.push(req.usuario.id_usuario); }
    if (id_sucursal)  { where += ' AND v.id_sucursal = ?'; params.push(id_sucursal); }
    if (estado)       { where += ' AND v.estado = ?';       params.push(estado); }
    if (desde)        { where += ' AND DATE(v.fecha) >= ?'; params.push(desde); }
    if (hasta)        { where += ' AND DATE(v.fecha) <= ?'; params.push(hasta); }

    const [totalRows] = await pool.query(`SELECT COUNT(*) AS total FROM ventas v ${where}`, params);
    const [rows]      = await pool.query(
      `SELECT v.*, u.nombre AS vendedor,
              CONCAT(IFNULL(c.nombre,''), ' ', IFNULL(c.apellido,'')) AS cliente,
              s.nombre AS sucursal,
              f.numero_factura
       FROM ventas v
       JOIN usuarios u   ON v.id_usuario  = u.id_usuario
       LEFT JOIN clientes c   ON v.id_cliente  = c.id_cliente
       JOIN sucursales s ON v.id_sucursal = s.id_sucursal
       LEFT JOIN facturas f   ON v.id_venta    = f.id_venta
       ${where}
       ORDER BY v.fecha DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    ok(res, { ventas: rows, total: totalRows[0].total });
  } catch (err) {
    error(res, err.message);
  }
};

const obtener = async (req, res) => {
  try {
    const [venta] = await pool.execute(
      `SELECT v.*, u.nombre AS vendedor,
              CONCAT(IFNULL(c.nombre,''),' ',IFNULL(c.apellido,'')) AS cliente,
              c.documento, c.email AS email_cliente, c.telefono AS tel_cliente,
              s.nombre AS sucursal, f.numero_factura, f.estado AS estado_factura, f.id_factura
       FROM ventas v
       JOIN usuarios u  ON v.id_usuario  = u.id_usuario
       LEFT JOIN clientes c   ON v.id_cliente   = c.id_cliente
       JOIN sucursales s ON v.id_sucursal = s.id_sucursal
       LEFT JOIN facturas f   ON v.id_venta     = f.id_venta
       WHERE v.id_venta = ? AND v.id_empresa = ?`,
      [req.params.id, req.usuario.id_empresa]
    );
    if (!venta.length) return noEncontrado(res);

    const [detalle] = await pool.execute(
      `SELECT dv.*, p.nombre AS producto, p.codigo
       FROM detalle_venta dv
       JOIN productos p ON dv.id_producto = p.id_producto
       WHERE dv.id_venta = ?`,
      [req.params.id]
    );

    ok(res, { ...venta[0], detalle });
  } catch (err) {
    error(res, err.message);
  }
};

const crear = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { items, id_cliente, metodo_pago = 'efectivo', descuento = 0, notas } = req.body;
    const { id_empresa, id_sucursal, id_usuario, tasa_iva } = req.usuario;

    if (!items?.length) return error(res, 'La venta requiere al menos un producto.', 400);

    await conn.beginTransaction();

    // Crear venta base
    const [ventaResult] = await conn.execute(
      'INSERT INTO ventas (id_empresa, id_sucursal, id_usuario, id_cliente, metodo_pago, descuento, notas) VALUES (?,?,?,?,?,?,?)',
      [id_empresa, id_sucursal, id_usuario, id_cliente || null, metodo_pago, descuento, notas || null]
    );
    const id_venta = ventaResult.insertId;

    let subtotal = 0;
    let impuesto = 0;

    for (const item of items) {
      const [prod] = await conn.execute(
        'SELECT precio_venta, stock_actual, nombre, aplica_iva FROM productos WHERE id_producto=? AND id_empresa=? AND activo=1 FOR UPDATE',
        [item.id_producto, id_empresa]
      );
      if (!prod.length) throw new Error(`Producto ID ${item.id_producto} no encontrado.`);
      if (prod[0].stock_actual < item.cantidad)
        throw new Error(`Stock insuficiente para "${prod[0].nombre}". Disponible: ${prod[0].stock_actual}.`);

      const precio = item.precio_unitario || prod[0].precio_venta;
      await conn.execute(
        'INSERT INTO detalle_venta (id_venta, id_producto, cantidad, precio_unitario) VALUES (?,?,?,?)',
        [id_venta, item.id_producto, item.cantidad, precio]
      );

      const sub = precio * item.cantidad;
      subtotal += sub;
      if (prod[0].aplica_iva) impuesto += sub * (tasa_iva / 100);
    }

    const total = subtotal - descuento + impuesto;
    await conn.execute(
      'UPDATE ventas SET subtotal=?, impuesto=?, total=? WHERE id_venta=?',
      [subtotal, impuesto, total, id_venta]
    );

    // Factura automática (trigger la numera)
    const [factResult] = await conn.execute(
      'INSERT INTO facturas (id_empresa, id_venta, subtotal, descuento, impuesto, total, metodo_pago) VALUES (?,?,?,?,?,?,?)',
      [id_empresa, id_venta, subtotal, descuento, impuesto, total, metodo_pago]
    );

    // Obtener número de factura generado por trigger
    const [fact] = await conn.execute('SELECT numero_factura FROM facturas WHERE id_factura=?', [factResult.insertId]);

    await conn.commit();
    creado(res, { id_venta, id_factura: factResult.insertId, numero_factura: fact[0].numero_factura, total }, 'Venta registrada.');
  } catch (err) {
    await conn.rollback();
    error(res, err.message, 400);
  } finally {
    conn.release();
  }
};

const cancelar = async (req, res) => {
  try {
    const [result] = await pool.execute(
      "UPDATE ventas SET estado='cancelada' WHERE id_venta=? AND id_empresa=? AND estado='completada'",
      [req.params.id, req.usuario.id_empresa]
    );
    if (!result.affectedRows) return error(res, 'No se puede cancelar esta venta.', 400);
    ok(res, {}, 'Venta cancelada.');
  } catch (err) {
    error(res, err.message);
  }
};

// Reportes
const masVendidos = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM v_top_productos WHERE id_empresa = ? LIMIT 10',
      [req.usuario.id_empresa]
    );
    ok(res, rows);
  } catch (err) {
    error(res, err.message);
  }
};

const porMes = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT DATE_FORMAT(fecha,'%Y-%m') AS mes,
              COUNT(*) AS num_ventas, SUM(total) AS total_mes,
              AVG(total) AS ticket_promedio
       FROM ventas WHERE id_empresa=? AND estado='completada'
       GROUP BY DATE_FORMAT(fecha,'%Y-%m')
       ORDER BY mes DESC LIMIT 12`,
      [req.usuario.id_empresa]
    );
    ok(res, rows);
  } catch (err) {
    error(res, err.message);
  }
};

const resumenDashboard = async (req, res) => {
  try {
    const { id_empresa } = req.usuario;
    const [hoy]   = await pool.execute('SELECT * FROM v_ventas_resumen WHERE id_empresa=? AND fecha=CURDATE()', [id_empresa]);
    const [mes]   = await pool.execute(
      `SELECT SUM(ingresos) AS ingresos_mes, SUM(total_ventas) AS ventas_mes
       FROM v_ventas_resumen WHERE id_empresa=? AND MONTH(fecha)=MONTH(CURDATE()) AND YEAR(fecha)=YEAR(CURDATE())`,
      [id_empresa]
    );
    const [stock] = await pool.execute(
      "SELECT COUNT(*) AS total FROM v_productos_stock WHERE id_empresa=? AND estado_stock IN ('agotado','critico')",
      [id_empresa]
    );
    const [clientes] = await pool.execute('SELECT COUNT(*) AS total FROM clientes WHERE id_empresa=? AND activo=1', [id_empresa]);

    ok(res, {
      ventas_hoy:      hoy[0]?.total_ventas || 0,
      ingresos_hoy:    hoy[0]?.ingresos || 0,
      ingresos_mes:    mes[0]?.ingresos_mes || 0,
      ventas_mes:      mes[0]?.ventas_mes || 0,
      stock_critico:   stock[0]?.total || 0,
      total_clientes:  clientes[0]?.total || 0,
    });
  } catch (err) {
    error(res, err.message);
  }
};

module.exports = { listar, obtener, crear, cancelar, masVendidos, porMes, resumenDashboard };
