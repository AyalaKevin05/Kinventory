// fix-views.js — Recrear vistas SQL con id_empresa expuesto
require('dotenv').config();
const mysql = require('mysql2/promise');

async function fixViews() {
  const connection = await mysql.createConnection({
    host:     process.env.DB_HOST,
    port:     parseInt(process.env.DB_PORT) || 3306,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl:      { rejectUnauthorized: false },
  });

  console.log('✅ Conectado a la base de datos\n');

  try {
    // 1. Vista v_productos_stock — agregar p.id_empresa
    await connection.query(`
      CREATE OR REPLACE VIEW v_productos_stock AS
      SELECT
          p.id_producto,
          p.id_empresa,
          p.codigo,
          p.nombre,
          p.precio_venta,
          p.precio_compra,
          p.stock_actual,
          p.stock_minimo,
          p.stock_maximo,
          p.aplica_iva,
          c.nombre AS categoria,
          pr.nombre AS proveedor,
          e.nombre AS empresa,
          CASE
              WHEN p.stock_actual = 0               THEN 'agotado'
              WHEN p.stock_actual <= p.stock_minimo THEN 'critico'
              WHEN p.stock_actual <= p.stock_minimo * 2 THEN 'bajo'
              ELSE 'normal'
          END AS estado_stock
      FROM productos p
      JOIN categorias c      ON p.id_categoria  = c.id_categoria
      LEFT JOIN proveedores pr ON p.id_proveedor = pr.id_proveedor
      JOIN empresas e         ON p.id_empresa    = e.id_empresa
      WHERE p.activo = 1
    `);
    console.log('✅ Vista v_productos_stock recreada con id_empresa');

    // 2. Vista v_movimientos_completos — agregar m.id_empresa
    await connection.query(`
      CREATE OR REPLACE VIEW v_movimientos_completos AS
      SELECT
          m.id_movimiento,
          m.id_empresa,
          m.creado_en,
          m.tipo,
          m.cantidad,
          m.stock_anterior,
          m.stock_nuevo,
          m.costo_unitario,
          m.referencia,
          m.notas,
          p.nombre     AS producto,
          p.codigo     AS codigo_producto,
          u.nombre     AS usuario,
          r.nombre     AS rol_usuario,
          s.nombre     AS sucursal,
          e.nombre     AS empresa
      FROM movimientos_inventario m
      JOIN productos p   ON m.id_producto = p.id_producto
      JOIN usuarios u    ON m.id_usuario  = u.id_usuario
      JOIN roles r       ON u.id_rol      = r.id_rol
      JOIN sucursales s  ON m.id_sucursal = s.id_sucursal
      JOIN empresas e    ON m.id_empresa  = e.id_empresa
    `);
    console.log('✅ Vista v_movimientos_completos recreada con id_empresa');

    // Verificar
    const [test1] = await connection.query('SELECT id_empresa, nombre FROM v_productos_stock LIMIT 1');
    console.log('\nTest v_productos_stock:', test1[0] || 'Sin filas (normal si no hay productos)');

    const [test2] = await connection.query('SELECT id_empresa FROM v_movimientos_completos LIMIT 1');
    console.log('Test v_movimientos_completos:', test2[0] || 'Sin filas (normal si no hay movimientos)');

    console.log('\n🎉 Vistas corregidas exitosamente.');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await connection.end();
  }
}

fixViews();
