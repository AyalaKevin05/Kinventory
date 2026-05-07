// controllers/inventarioController.js — Módulo Almacenista
const pool = require('../config/db');
const { ok, creado, error, noEncontrado } = require('../utils/response');

const listarMovimientos = async (req, res) => {
  try {
    const tipo       = req.query.tipo        || null;
    const id_producto= req.query.id_producto ? parseInt(req.query.id_producto) : null;
    const desde      = req.query.desde       || null;
    const hasta      = req.query.hasta       || null;
    const page       = Math.max(1, parseInt(req.query.page)  || 1);
    const limit      = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
    const offset     = (page - 1) * limit;
    const { id_empresa } = req.usuario;

    let where = 'WHERE id_empresa = ?';
    const params = [id_empresa];

    if (tipo)        { where += ' AND tipo = ?';             params.push(tipo); }
    if (id_producto) { where += ' AND id_producto = ?';      params.push(id_producto); }
    if (desde)       { where += ' AND DATE(creado_en) >= ?'; params.push(desde); }
    if (hasta)       { where += ' AND DATE(creado_en) <= ?'; params.push(hasta); }

    const [totalRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM movimientos_inventario ${where}`, params
    );
    const [rows] = await pool.query(
      `SELECT * FROM v_movimientos_completos ${where}
       ORDER BY creado_en DESC LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    ok(res, { movimientos: rows, total: totalRows[0].total });
  } catch (err) {
    error(res, err.message);
  }
};

const registrarMovimiento = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { id_producto, tipo, cantidad, costo_unitario, referencia, proveedor, notas } = req.body;
    const { id_empresa, id_sucursal, id_usuario } = req.usuario;

    await conn.beginTransaction();

    // Bloquear fila del producto
    const [prod] = await conn.execute(
      'SELECT stock_actual, nombre, stock_minimo FROM productos WHERE id_producto=? AND id_empresa=? AND activo=1 FOR UPDATE',
      [id_producto, id_empresa]
    );
    if (!prod.length) throw new Error('Producto no encontrado.');

    const { stock_actual, nombre, stock_minimo } = prod[0];
    let stock_nuevo;

    const esEntrada = tipo.startsWith('entrada') || tipo === 'traslado_entrada';
    const esSalida  = tipo.startsWith('salida')  || tipo === 'traslado_salida';

    if (esEntrada) {
      stock_nuevo = stock_actual + parseInt(cantidad);
    } else if (esSalida) {
      if (stock_actual < cantidad) throw new Error(`Stock insuficiente para "${nombre}". Disponible: ${stock_actual}.`);
      stock_nuevo = stock_actual - parseInt(cantidad);
    } else {
      throw new Error('Tipo de movimiento inválido.');
    }

    // Actualizar stock
    await conn.execute('UPDATE productos SET stock_actual=? WHERE id_producto=?', [stock_nuevo, id_producto]);

    // Registrar movimiento
    const [result] = await conn.execute(
      `INSERT INTO movimientos_inventario
        (id_empresa, id_sucursal, id_producto, id_usuario, tipo, cantidad,
         stock_anterior, stock_nuevo, costo_unitario, referencia, proveedor, notas)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id_empresa, id_sucursal, id_producto, id_usuario, tipo, cantidad,
       stock_actual, stock_nuevo, costo_unitario || 0, referencia || null,
       proveedor || null, notas || null]
    );

    // Alerta si quedó en stock crítico
    const alertaCritica = stock_nuevo <= stock_minimo && stock_nuevo > 0;
    const alertaAgotado = stock_nuevo === 0;

    await conn.commit();

    creado(res, {
      id_movimiento: result.insertId,
      stock_anterior: stock_actual,
      stock_nuevo,
      alerta: alertaAgotado ? 'AGOTADO' : alertaCritica ? 'CRITICO' : null,
    }, 'Movimiento registrado.');
  } catch (err) {
    await conn.rollback();
    error(res, err.message, 400);
  } finally {
    conn.release();
  }
};

const ajustarStock = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { id_producto, stock_nuevo, motivo } = req.body;
    const { id_empresa, id_sucursal, id_usuario } = req.usuario;

    await conn.beginTransaction();

    const [prod] = await conn.execute(
      'SELECT stock_actual, nombre FROM productos WHERE id_producto=? AND id_empresa=? FOR UPDATE',
      [id_producto, id_empresa]
    );
    if (!prod.length) throw new Error('Producto no encontrado.');

    const stock_anterior = prod[0].stock_actual;
    const diferencia     = stock_nuevo - stock_anterior;
    const tipo           = diferencia >= 0 ? 'entrada_ajuste' : 'salida_ajuste';

    await conn.execute('UPDATE productos SET stock_actual=? WHERE id_producto=?', [stock_nuevo, id_producto]);
    await conn.execute(
      `INSERT INTO movimientos_inventario
        (id_empresa, id_sucursal, id_producto, id_usuario, tipo, cantidad, stock_anterior, stock_nuevo, notas)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [id_empresa, id_sucursal, id_producto, id_usuario, tipo, Math.abs(diferencia), stock_anterior, stock_nuevo, motivo || 'Ajuste manual']
    );

    await conn.commit();
    ok(res, { stock_anterior, stock_nuevo }, 'Stock ajustado.');
  } catch (err) {
    await conn.rollback();
    error(res, err.message, 400);
  } finally {
    conn.release();
  }
};

const resumenInventario = async (req, res) => {
  try {
    const { id_empresa } = req.usuario;
    const [stats] = await pool.execute(
      `SELECT
        COUNT(*)                                                    AS total_productos,
        SUM(CASE WHEN estado_stock='normal'  THEN 1 ELSE 0 END)    AS en_stock,
        SUM(CASE WHEN estado_stock='bajo'    THEN 1 ELSE 0 END)    AS stock_bajo,
        SUM(CASE WHEN estado_stock='critico' THEN 1 ELSE 0 END)    AS stock_critico,
        SUM(CASE WHEN estado_stock='agotado' THEN 1 ELSE 0 END)    AS agotados,
        SUM(stock_actual * precio_venta)                            AS valor_inventario
       FROM v_productos_stock WHERE id_empresa = ?`,
      [id_empresa]
    );
    ok(res, stats[0]);
  } catch (err) {
    error(res, err.message);
  }
};

module.exports = { listarMovimientos, registrarMovimiento, ajustarStock, resumenInventario };
