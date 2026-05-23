// server.js — Servidor principal Kinventory
require('dotenv').config();
const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const morgan      = require('morgan');
const rateLimit   = require('express-rate-limit');
const routes      = require('./routes');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Seguridad ──────────────────────────────────────────────
app.use(helmet());
app.set('trust proxy', 1);

// ── CORS (Debe ir antes del Rate Limit) ───────────────
app.use(cors({
  origin:      process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : '*',
  credentials: true,
  methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Rate Limiting ──────────────────────────────────────────
app.use('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 50, // Aumentado para evitar falsos positivos
  message: { ok: false, mensaje: 'Demasiados intentos. Intenta en 15 minutos.' },
}));

app.use('/api', rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  max:       parseInt(process.env.RATE_LIMIT_MAX)       || 1000, // Aumentado a 1000
  message:   { ok: false, mensaje: 'Demasiadas solicitudes.' },
}));

// ── Parsers ────────────────────────────────────────────────
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Logger ─────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));

// ── Ruta base ──────────────────────────────────────────────
app.get('/', (_, res) => res.json({
  ok:      true,
  app:     'Kinventory API',
  version: '1.0.0',
  status:  'running',
}));

// ── Rutas API ──────────────────────────────────────────────
app.use('/api', routes);

// ── 404 ────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ ok: false, mensaje: `Ruta ${req.path} no encontrada.` }));

// ── Error global ───────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Error global:', err.stack);
  res.status(500).json({ ok: false, mensaje: 'Error interno del servidor.' });
});

// ── Auto-migración FIFO (corre al iniciar, seguro de re-ejecutar) ────────────
async function runMigrations() {
  try {
    const pool = require('./config/db');

    // 1. Crear tabla lotes_inventario si no existe
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS lotes_inventario (
        id_lote           INT UNSIGNED   AUTO_INCREMENT PRIMARY KEY,
        id_producto       INT UNSIGNED   NOT NULL,
        id_empresa        INT UNSIGNED   NOT NULL,
        id_movimiento     INT UNSIGNED   NULL,
        cantidad_inicial  INT            NOT NULL,
        cantidad_restante INT            NOT NULL DEFAULT 0,
        costo_unitario    DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
        precio_venta      DECIMAL(10,2)  NOT NULL,
        fecha_entrada     TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        activo            TINYINT(1)     NOT NULL DEFAULT 1,
        CONSTRAINT fk_lote_producto FOREIGN KEY (id_producto) REFERENCES productos(id_producto),
        CONSTRAINT fk_lote_empresa  FOREIGN KEY (id_empresa)  REFERENCES empresas(id_empresa),
        INDEX idx_lote_producto (id_producto),
        INDEX idx_lote_activo   (activo),
        INDEX idx_lote_fecha    (fecha_entrada)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 2. Inicializar lotes para productos con stock que aún no tienen lote
    await pool.execute(`
      INSERT INTO lotes_inventario
        (id_producto, id_empresa, cantidad_inicial, cantidad_restante, costo_unitario, precio_venta)
      SELECT p.id_producto, p.id_empresa, p.stock_actual, p.stock_actual, p.precio_compra, p.precio_venta
      FROM productos p
      WHERE p.activo = 1
        AND p.stock_actual > 0
        AND NOT EXISTS (
          SELECT 1 FROM lotes_inventario l
          WHERE l.id_producto = p.id_producto AND l.id_empresa = p.id_empresa
        )
    `);

    console.log('✅ Migración FIFO completada (lotes_inventario lista)');
  } catch (err) {
    // No abortar el servidor si la migración falla
    console.warn('⚠️  Migración FIFO omitida:', err.message);
  }
}

app.listen(PORT, async () => {
  console.log(`\n🚀 Kinventory API corriendo en http://localhost:${PORT}`);
  console.log(`📡 Entorno: ${process.env.NODE_ENV || 'development'}\n`);
  await runMigrations();
});

