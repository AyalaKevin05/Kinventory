// controllers/diagnosticoController.js
// RF-02: Contar registros de la tabla más importante (productos)
// RF-03: Medir latencia de la consulta
// RF-04: Validaciones de stock y datos

const pool = require('../config/db');
const { ok, error } = require('../utils/response');

// ── RF-02 + RF-03: Conteo de registros con medición de latencia ──────────────
const conteoTablas = async (req, res) => {
  try {
    const resultados = [];

    // Tablas a medir (ordenadas por importancia en el sistema)
    const tablas = [
      { nombre: 'productos',               descripcion: 'Tabla principal — catálogo completo de productos' },
      { nombre: 'ventas',                  descripcion: 'Transacciones de ventas realizadas' },
      { nombre: 'detalle_ventas',          descripcion: 'Líneas de detalle por venta' },
      { nombre: 'movimientos_inventario',  descripcion: 'Historial de entradas y salidas de stock' },
      { nombre: 'lotes_inventario',        descripcion: 'Lotes FIFO del inventario' },
      { nombre: 'facturas',               descripcion: 'Facturas generadas' },
      { nombre: 'usuarios',               descripcion: 'Usuarios del sistema' },
      { nombre: 'clientes',              descripcion: 'Clientes registrados' },
    ];

    for (const tabla of tablas) {
      const inicio = process.hrtime.bigint();          // RF-03: inicio del timer (nanosegundos)

      let total = 0;
      try {
        const [rows] = await pool.query(`SELECT COUNT(*) AS total FROM \`${tabla.nombre}\``);
        total = rows[0].total;
      } catch (_) {
        total = null; // tabla podría no existir aún
      }

      const fin     = process.hrtime.bigint();          // RF-03: fin del timer
      const latencia_ns  = Number(fin - inicio);
      const latencia_ms  = (latencia_ns / 1_000_000).toFixed(3);
      const latencia_us  = (latencia_ns / 1_000).toFixed(1);

      resultados.push({
        tabla:       tabla.nombre,
        descripcion: tabla.descripcion,
        total_registros: total,
        latencia_ms:  parseFloat(latencia_ms),
        latencia_us:  parseFloat(latencia_us),
        latencia_ns:  latencia_ns,
      });
    }

    // Tabla más importante = productos (primera en la lista)
    const tablaPrincipal = resultados[0];

    ok(res, {
      tabla_principal: tablaPrincipal,
      todas_las_tablas: resultados,
      medicion_en: new Date().toISOString(),
    }, `RF-02/RF-03: ${tablaPrincipal.total_registros} registros en "${tablaPrincipal.tabla}" — Latencia: ${tablaPrincipal.latencia_ms} ms`);

  } catch (err) {
    error(res, err.message);
  }
};

// ── RF-04: Validaciones de stock y consistencia de datos ─────────────────────
const validacionesStock = async (req, res) => {
  try {
    const { id_empresa } = req.usuario;
    const alertas  = [];
    const ok_list  = [];

    // ── 1. Productos con stock_actual < stock_minimo (stock crítico) ──
    const [stockCritico] = await pool.query(
      `SELECT id_producto, nombre, stock_actual, stock_minimo, stock_maximo
       FROM productos
       WHERE id_empresa = ? AND activo = 1 AND stock_actual < stock_minimo AND stock_actual > 0
       ORDER BY stock_actual ASC`,
      [id_empresa]
    );
    if (stockCritico.length > 0) {
      alertas.push({
        tipo:      'STOCK_CRITICO',
        severidad: 'alta',
        cantidad:  stockCritico.length,
        mensaje:   `${stockCritico.length} producto(s) con stock por debajo del mínimo`,
        productos: stockCritico,
      });
    } else {
      ok_list.push('Sin productos en stock crítico ✔');
    }

    // ── 2. Productos agotados ──
    const [agotados] = await pool.query(
      `SELECT id_producto, nombre, stock_actual, stock_minimo
       FROM productos
       WHERE id_empresa = ? AND activo = 1 AND stock_actual = 0`,
      [id_empresa]
    );
    if (agotados.length > 0) {
      alertas.push({
        tipo:      'AGOTADO',
        severidad: 'critica',
        cantidad:  agotados.length,
        mensaje:   `${agotados.length} producto(s) completamente agotados`,
        productos: agotados,
      });
    } else {
      ok_list.push('Sin productos agotados ✔');
    }

    // ── 3. Productos con stock_actual > stock_maximo (sobrestock) ──
    const [sobrestock] = await pool.query(
      `SELECT id_producto, nombre, stock_actual, stock_maximo
       FROM productos
       WHERE id_empresa = ? AND activo = 1 AND stock_actual > stock_maximo`,
      [id_empresa]
    );
    if (sobrestock.length > 0) {
      alertas.push({
        tipo:      'SOBRESTOCK',
        severidad: 'media',
        cantidad:  sobrestock.length,
        mensaje:   `${sobrestock.length} producto(s) superan el stock máximo permitido`,
        productos: sobrestock,
      });
    } else {
      ok_list.push('Sin productos en sobrestock ✔');
    }

    // ── 4. Productos con precio_venta <= precio_compra (margen negativo) ──
    const [margenNegativo] = await pool.query(
      `SELECT id_producto, nombre, precio_compra, precio_venta,
              ROUND(((precio_venta - precio_compra) / precio_compra) * 100, 2) AS margen_pct
       FROM productos
       WHERE id_empresa = ? AND activo = 1 AND precio_venta <= precio_compra`,
      [id_empresa]
    );
    if (margenNegativo.length > 0) {
      alertas.push({
        tipo:      'MARGEN_NEGATIVO',
        severidad: 'alta',
        cantidad:  margenNegativo.length,
        mensaje:   `${margenNegativo.length} producto(s) con precio de venta ≤ precio de compra`,
        productos: margenNegativo,
      });
    } else {
      ok_list.push('Todos los productos tienen margen positivo ✔');
    }

    // ── 5. Productos con stock_minimo >= stock_maximo (config incoherente) ──
    const [configIncoherente] = await pool.query(
      `SELECT id_producto, nombre, stock_minimo, stock_maximo
       FROM productos
       WHERE id_empresa = ? AND activo = 1 AND stock_minimo >= stock_maximo`,
      [id_empresa]
    );
    if (configIncoherente.length > 0) {
      alertas.push({
        tipo:      'CONFIG_STOCK_INVALIDA',
        severidad: 'media',
        cantidad:  configIncoherente.length,
        mensaje:   `${configIncoherente.length} producto(s) con stock_minimo ≥ stock_maximo`,
        productos: configIncoherente,
      });
    } else {
      ok_list.push('Configuración de stock_minimo/maximo coherente en todos los productos ✔');
    }

    // ── 6. Productos sin categoría asignada ──
    const [sinCategoria] = await pool.query(
      `SELECT p.id_producto, p.nombre
       FROM productos p
       LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
       WHERE p.id_empresa = ? AND p.activo = 1 AND c.id_categoria IS NULL`,
      [id_empresa]
    );
    if (sinCategoria.length > 0) {
      alertas.push({
        tipo:      'SIN_CATEGORIA',
        severidad: 'baja',
        cantidad:  sinCategoria.length,
        mensaje:   `${sinCategoria.length} producto(s) sin categoría válida`,
        productos: sinCategoria,
      });
    } else {
      ok_list.push('Todos los productos tienen categoría asignada ✔');
    }

    // ── Resumen general ──
    const [resumen] = await pool.query(
      `SELECT
         COUNT(*)                                               AS total_productos,
         SUM(CASE WHEN stock_actual > stock_minimo THEN 1 ELSE 0 END)  AS con_stock_normal,
         SUM(CASE WHEN stock_actual <= stock_minimo AND stock_actual > 0 THEN 1 ELSE 0 END) AS stock_critico,
         SUM(CASE WHEN stock_actual = 0 THEN 1 ELSE 0 END)    AS agotados,
         SUM(CASE WHEN stock_actual > stock_maximo THEN 1 ELSE 0 END)  AS sobrestock,
         ROUND(AVG((precio_venta - precio_compra) / precio_compra * 100), 2) AS margen_promedio_pct,
         SUM(stock_actual * precio_venta)                      AS valor_total_inventario
       FROM productos
       WHERE id_empresa = ? AND activo = 1`,
      [id_empresa]
    );

    ok(res, {
      resumen:         resumen[0],
      total_alertas:   alertas.length,
      alertas,
      validaciones_ok: ok_list,
      evaluado_en:     new Date().toISOString(),
    }, alertas.length === 0
      ? 'RF-04: Todas las validaciones de stock pasaron correctamente ✔'
      : `RF-04: Se encontraron ${alertas.length} problema(s) en las validaciones de stock`
    );

  } catch (err) {
    error(res, err.message);
  }
};

module.exports = { conteoTablas, validacionesStock };
