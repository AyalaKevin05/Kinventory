// controllers/inventarioController.js — Módulo Almacenista (con soporte FIFO de lotes)
const pool = require('../config/db');
const { ok, creado, error, noEncontrado } = require('../utils/response');

const listarMovimientos = async (req, res) => {
  try {
    const tipo        = req.query.tipo        || null;
    const id_producto = req.query.id_producto ? parseInt(req.query.id_producto) : null;
    const desde       = req.query.desde       || null;
    const hasta       = req.query.hasta       || null;
    const page        = Math.max(1, parseInt(req.query.page)  || 1);
    const limit       = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
    const offset      = (page - 1) * limit;
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
    const {
      id_producto, tipo, cantidad, costo_unitario,
      referencia, proveedor, notas,
      // Nuevo campo FIFO: precio de venta para este lote (solo en entradas)
      precio_venta_lote,
    } = req.body;
    const { id_empresa, id_sucursal, id_usuario } = req.usuario;

    await conn.beginTransaction();

    // Bloquear fila del producto
    const [prod] = await conn.execute(
      'SELECT stock_actual, nombre, stock_minimo, precio_venta FROM productos WHERE id_producto=? AND id_empresa=? AND activo=1 FOR UPDATE',
      [id_producto, id_empresa]
    );
    if (!prod.length) throw new Error('Producto no encontrado.');

    const { stock_actual, nombre, stock_minimo, precio_venta: precio_actual } = prod[0];
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

    // ── LÓGICA FIFO ────────────────────────────────────────────────────────────
    if (esEntrada) {
      const nuevoPrecioVenta = parseFloat(precio_venta_lote) || precio_actual;

      // Verificar si existe la tabla lotes_inventario (por si no se ejecutó migración aún)
      const [tableCheck] = await conn.execute(
        `SELECT COUNT(*) AS existe FROM information_schema.tables
         WHERE table_schema = DATABASE() AND table_name = 'lotes_inventario'`
      );

      if (tableCheck[0].existe > 0) {
        // Crear lote para esta entrada
        await conn.execute(
          `INSERT INTO lotes_inventario
            (id_producto, id_empresa, id_movimiento, cantidad_inicial, cantidad_restante,
             costo_unitario, precio_venta, fecha_entrada)
           VALUES (?,?,?,?,?,?,?,NOW())`,
          [id_producto, id_empresa, result.insertId, parseInt(cantidad), parseInt(cantidad),
           parseFloat(costo_unitario) || 0, nuevoPrecioVenta]
        );

        // Si el precio del lote nuevo difiere, actualizar precio del producto
        // con el precio del lote más antiguo con stock disponible (FIFO)
        const [loteActivo] = await conn.execute(
          `SELECT precio_venta FROM lotes_inventario
           WHERE id_producto=? AND id_empresa=? AND activo=1 AND cantidad_restante > 0
           ORDER BY fecha_entrada ASC LIMIT 1`,
          [id_producto, id_empresa]
        );

        if (loteActivo.length > 0) {
          await conn.execute(
            'UPDATE productos SET precio_venta=? WHERE id_producto=?',
            [loteActivo[0].precio_venta, id_producto]
          );
        }
      }
    }
    // ── FIN LÓGICA FIFO ────────────────────────────────────────────────────────

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

// Retorna lotes activos de un producto (para mostrar en el panel del almacenista)
const lotesProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const { id_empresa } = req.usuario;

    // Verificar si la tabla existe
    const [tableCheck] = await pool.execute(
      `SELECT COUNT(*) AS existe FROM information_schema.tables
       WHERE table_schema = DATABASE() AND table_name = 'lotes_inventario'`
    );

    if (tableCheck[0].existe === 0) {
      return ok(res, { lotes: [], fifo_disponible: false });
    }

    const [lotes] = await pool.execute(
      `SELECT l.*, m.referencia, m.proveedor
       FROM lotes_inventario l
       LEFT JOIN movimientos_inventario m ON l.id_movimiento = m.id_movimiento
       WHERE l.id_producto = ? AND l.id_empresa = ? AND l.activo = 1 AND l.cantidad_restante > 0
       ORDER BY l.fecha_entrada ASC`,
      [id, id_empresa]
    );

    ok(res, { lotes, fifo_disponible: true });
  } catch (err) {
    error(res, err.message);
  }
};

module.exports = { listarMovimientos, registrarMovimiento, ajustarStock, resumenInventario, lotesProducto };
