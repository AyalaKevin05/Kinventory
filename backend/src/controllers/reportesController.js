// controllers/reportesController.js
const pool = require('../config/db');
const { ok, error } = require('../utils/response');

const auditoria = async (req, res) => {
  try {
    const { desde, hasta, accion, page = 1, limit = 50 } = req.query;
    const { id_empresa } = req.usuario;
    const offset = (page - 1) * limit;

    let where = 'WHERE a.id_empresa = ?';
    const params = [id_empresa];

    if (accion) { where += ' AND a.accion = ?'; params.push(accion); }
    if (desde)  { where += ' AND DATE(a.creado_en) >= ?'; params.push(desde); }
    if (hasta)  { where += ' AND DATE(a.creado_en) <= ?'; params.push(hasta); }

    const [total] = await pool.execute(`SELECT COUNT(*) AS total FROM auditoria a ${where}`, params);
    const [rows]  = await pool.execute(
      `SELECT a.*, u.nombre AS usuario, r.nombre AS rol
       FROM auditoria a
       JOIN usuarios u ON a.id_usuario = u.id_usuario
       JOIN roles r    ON u.id_rol     = r.id_rol
       ${where}
       ORDER BY a.creado_en DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    ok(res, { registros: rows, total: total[0].total });
  } catch (err) {
    error(res, err.message);
  }
};

const ventasPorVendedor = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT u.id_usuario, CONCAT(u.nombre,' ',IFNULL(u.apellido,'')) AS vendedor,
              COUNT(v.id_venta) AS num_ventas,
              SUM(v.total)      AS total_vendido,
              AVG(v.total)      AS ticket_promedio
       FROM ventas v
       JOIN usuarios u ON v.id_usuario = u.id_usuario
       WHERE v.id_empresa=? AND v.estado='completada'
         AND MONTH(v.fecha)=MONTH(CURDATE()) AND YEAR(v.fecha)=YEAR(CURDATE())
       GROUP BY u.id_usuario, vendedor
       ORDER BY total_vendido DESC`,
      [req.usuario.id_empresa]
    );
    ok(res, rows);
  } catch (err) {
    error(res, err.message);
  }
};

const exportarInventario = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT p.codigo, p.nombre, c.nombre AS categoria,
              pr.nombre AS proveedor, p.precio_compra, p.precio_venta,
              p.stock_actual, p.stock_minimo, p.unidad_medida,
              (p.precio_venta * p.stock_actual) AS valor_total,
              CASE
                WHEN p.stock_actual=0               THEN 'AGOTADO'
                WHEN p.stock_actual<=p.stock_minimo THEN 'CRITICO'
                ELSE 'NORMAL'
              END AS estado
       FROM productos p
       JOIN categorias c ON p.id_categoria=c.id_categoria
       LEFT JOIN proveedores pr ON p.id_proveedor=pr.id_proveedor
       WHERE p.id_empresa=? AND p.activo=1
       ORDER BY c.nombre, p.nombre`,
      [req.usuario.id_empresa]
    );
    ok(res, rows);
  } catch (err) {
    error(res, err.message);
  }
};

module.exports = { auditoria, ventasPorVendedor, exportarInventario };
