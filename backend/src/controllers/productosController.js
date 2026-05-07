// controllers/productosController.js
const pool = require('../config/db');
const { ok, creado, error, noEncontrado, badRequest } = require('../utils/response');
const { enviarAlertaStockBajo } = require('../utils/email');

const listar = async (req, res) => {
  try {
    const busqueda    = req.query.busqueda   || null;
    const id_categoria= req.query.id_categoria ? parseInt(req.query.id_categoria) : null;
    const estado_stock= req.query.estado_stock|| null;
    const page        = Math.max(1, parseInt(req.query.page)  || 1);
    const limit       = Math.min(500, Math.max(1, parseInt(req.query.limit) || 50));
    const offset      = (page - 1) * limit;
    const { id_empresa } = req.usuario;

    let where = 'WHERE p.id_empresa = ? AND p.activo = 1';
    const params = [id_empresa];

    if (busqueda)     { where += ' AND (p.nombre LIKE ? OR p.codigo LIKE ? OR p.codigo_barras LIKE ?)'; params.push(`%${busqueda}%`, `%${busqueda}%`, `%${busqueda}%`); }
    if (id_categoria) { where += ' AND p.id_categoria = ?'; params.push(id_categoria); }
    if (estado_stock === 'bajo')    where += ' AND p.stock_actual <= p.stock_minimo AND p.stock_actual > 0';
    if (estado_stock === 'agotado') where += ' AND p.stock_actual = 0';
    if (estado_stock === 'normal')  where += ' AND p.stock_actual > p.stock_minimo';

    // Usar query() en lugar de execute() para consultas dinámicas con LIMIT/OFFSET numérico
    const [totalRows] = await pool.query(`SELECT COUNT(*) AS total FROM productos p ${where}`, params);
    const [rows]      = await pool.query(
      `SELECT p.*, c.nombre AS categoria, c.color AS categoria_color,
              pr.nombre AS proveedor,
              CASE
                WHEN p.stock_actual = 0               THEN 'agotado'
                WHEN p.stock_actual <= p.stock_minimo THEN 'critico'
                WHEN p.stock_actual <= p.stock_minimo*2 THEN 'bajo'
                ELSE 'normal'
              END AS estado_stock
       FROM productos p
       JOIN categorias c ON p.id_categoria = c.id_categoria
       LEFT JOIN proveedores pr ON p.id_proveedor = pr.id_proveedor
       ${where}
       ORDER BY p.nombre
       LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    ok(res, { productos: rows, total: totalRows[0].total, page, limit });
  } catch (err) {
    error(res, err.message);
  }
};

const obtener = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT p.*, c.nombre AS categoria, pr.nombre AS proveedor
       FROM productos p
       JOIN categorias c ON p.id_categoria = c.id_categoria
       LEFT JOIN proveedores pr ON p.id_proveedor = pr.id_proveedor
       WHERE p.id_producto = ? AND p.id_empresa = ?`,
      [req.params.id, req.usuario.id_empresa]
    );
    if (!rows.length) return noEncontrado(res);
    ok(res, rows[0]);
  } catch (err) {
    error(res, err.message);
  }
};

const crear = async (req, res) => {
  try {
    const { nombre, descripcion, precio_compra, precio_venta, stock_actual, stock_minimo,
            stock_maximo, id_categoria, id_proveedor, codigo, codigo_barras, unidad_medida, aplica_iva } = req.body;
    const { id_empresa } = req.usuario;

    const [result] = await pool.execute(
      `INSERT INTO productos (id_empresa, id_categoria, id_proveedor, codigo, codigo_barras,
        nombre, descripcion, precio_compra, precio_venta, stock_actual, stock_minimo,
        stock_maximo, unidad_medida, aplica_iva)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id_empresa, id_categoria, id_proveedor || null, codigo || null, codigo_barras || null,
       nombre, descripcion || null, precio_compra || 0, precio_venta, stock_actual || 0,
       stock_minimo || 5, stock_maximo || 1000, unidad_medida || 'unidad', aplica_iva ?? 1]
    );

    creado(res, { id: result.insertId }, 'Producto creado.');
  } catch (err) {
    error(res, err.message);
  }
};

const actualizar = async (req, res) => {
  try {
    const { nombre, descripcion, precio_compra, precio_venta, stock_minimo, stock_maximo,
            id_categoria, id_proveedor, codigo, codigo_barras, unidad_medida, aplica_iva } = req.body;

    const [result] = await pool.execute(
      `UPDATE productos SET nombre=?, descripcion=?, precio_compra=?, precio_venta=?,
        stock_minimo=?, stock_maximo=?, id_categoria=?, id_proveedor=?,
        codigo=?, codigo_barras=?, unidad_medida=?, aplica_iva=?
       WHERE id_producto=? AND id_empresa=?`,
      [nombre, descripcion||null, precio_compra||0, precio_venta, stock_minimo||5,
       stock_maximo||1000, id_categoria, id_proveedor||null, codigo||null,
       codigo_barras||null, unidad_medida||'unidad', aplica_iva??1,
       req.params.id, req.usuario.id_empresa]
    );

    if (!result.affectedRows) return noEncontrado(res);
    ok(res, {}, 'Producto actualizado.');
  } catch (err) {
    error(res, err.message);
  }
};

const eliminar = async (req, res) => {
  try {
    const [result] = await pool.execute(
      'UPDATE productos SET activo=0 WHERE id_producto=? AND id_empresa=?',
      [req.params.id, req.usuario.id_empresa]
    );
    if (!result.affectedRows) return noEncontrado(res);
    ok(res, {}, 'Producto eliminado.');
  } catch (err) {
    error(res, err.message);
  }
};

const stockBajo = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT * FROM v_productos_stock
       WHERE id_empresa = ? AND estado_stock IN ('agotado','critico','bajo')
       ORDER BY stock_actual ASC`,
      [req.usuario.id_empresa]
    );
    ok(res, rows);
  } catch (err) {
    error(res, err.message);
  }
};

const alertarStockBajo = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT * FROM v_productos_stock
       WHERE id_empresa = ? AND estado_stock IN ('agotado','critico')`,
      [req.usuario.id_empresa]
    );

    if (!rows.length) return ok(res, {}, 'No hay productos con stock crítico.');

    const [empresa] = await pool.execute('SELECT email, nombre FROM empresas WHERE id_empresa=?', [req.usuario.id_empresa]);

    await enviarAlertaStockBajo({
      destinatario: empresa[0].email,
      empresa:      empresa[0].nombre,
      productos:    rows,
    });

    ok(res, { enviados: rows.length }, `Alerta enviada con ${rows.length} productos.`);
  } catch (err) {
    error(res, err.message);
  }
};

module.exports = { listar, obtener, crear, actualizar, eliminar, stockBajo, alertarStockBajo };
