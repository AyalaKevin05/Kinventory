// controllers/facturasController.js
const pool = require('../config/db');
const { ok, error, noEncontrado } = require('../utils/response');

const listar = async (req, res) => {
  try {
    const { estado, desde, hasta, page = 1, limit = 50 } = req.query;
    const { id_empresa } = req.usuario;
    const offset = (page - 1) * limit;

    let where = 'WHERE f.id_empresa = ?';
    const params = [id_empresa];

    if (estado) { where += ' AND f.estado = ?';              params.push(estado); }
    if (desde)  { where += ' AND DATE(f.fecha_emision) >= ?'; params.push(desde); }
    if (hasta)  { where += ' AND DATE(f.fecha_emision) <= ?'; params.push(hasta); }

    const [total] = await pool.execute(`SELECT COUNT(*) AS total FROM facturas f ${where}`, params);
    const [rows]  = await pool.execute(
      `SELECT f.*, u.nombre AS vendedor,
              CONCAT(IFNULL(c.nombre,''),' ',IFNULL(c.apellido,'')) AS cliente,
              c.documento
       FROM facturas f
       JOIN ventas v   ON f.id_venta    = v.id_venta
       JOIN usuarios u ON v.id_usuario  = u.id_usuario
       LEFT JOIN clientes c  ON v.id_cliente   = c.id_cliente
       ${where}
       ORDER BY f.fecha_emision DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    ok(res, { facturas: rows, total: total[0].total });
  } catch (err) {
    error(res, err.message);
  }
};

const obtener = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT f.*, u.nombre AS vendedor,
              CONCAT(IFNULL(c.nombre,''),' ',IFNULL(c.apellido,'')) AS cliente,
              c.documento, c.email AS email_cliente, c.telefono, c.direccion,
              e.nombre AS empresa, e.nit, e.telefono AS tel_empresa,
              e.direccion AS dir_empresa, e.ciudad, e.pie_factura, e.logo_url
       FROM facturas f
       JOIN ventas v    ON f.id_venta    = v.id_venta
       JOIN usuarios u  ON v.id_usuario  = u.id_usuario
       LEFT JOIN clientes c   ON v.id_cliente   = c.id_cliente
       JOIN empresas e   ON f.id_empresa  = e.id_empresa
       WHERE f.id_factura = ? AND f.id_empresa = ?`,
      [req.params.id, req.usuario.id_empresa]
    );
    if (!rows.length) return noEncontrado(res);

    const [detalle] = await pool.execute(
      `SELECT dv.*, p.nombre AS producto, p.codigo
       FROM detalle_venta dv
       JOIN productos p ON dv.id_producto = p.id_producto
       WHERE dv.id_venta = ?`,
      [rows[0].id_venta]
    );

    ok(res, { ...rows[0], detalle });
  } catch (err) {
    error(res, err.message);
  }
};

const cambiarEstado = async (req, res) => {
  try {
    const estados = ['emitida', 'pagada', 'anulada', 'vencida'];
    if (!estados.includes(req.body.estado))
      return error(res, `Estado inválido. Opciones: ${estados.join(', ')}`, 400);

    const [result] = await pool.execute(
      'UPDATE facturas SET estado=? WHERE id_factura=? AND id_empresa=?',
      [req.body.estado, req.params.id, req.usuario.id_empresa]
    );
    if (!result.affectedRows) return noEncontrado(res);
    ok(res, {}, `Factura marcada como ${req.body.estado}.`);
  } catch (err) {
    error(res, err.message);
  }
};

const resumen = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT
        COUNT(*)                                               AS total,
        SUM(CASE WHEN estado='emitida'  THEN 1 ELSE 0 END)   AS emitidas,
        SUM(CASE WHEN estado='pagada'   THEN 1 ELSE 0 END)   AS pagadas,
        SUM(CASE WHEN estado='anulada'  THEN 1 ELSE 0 END)   AS anuladas,
        COALESCE(SUM(CASE WHEN estado='pagada'  THEN total END), 0) AS cobrado,
        COALESCE(SUM(CASE WHEN estado='emitida' THEN total END), 0) AS pendiente
       FROM facturas WHERE id_empresa = ?`,
      [req.usuario.id_empresa]
    );
    ok(res, rows[0]);
  } catch (err) {
    error(res, err.message);
  }
};

module.exports = { listar, obtener, cambiarEstado, resumen };
