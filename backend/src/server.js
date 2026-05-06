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

// ── Rate Limiting ──────────────────────────────────────────
app.use('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10,
  message: { ok: false, mensaje: 'Demasiados intentos. Intenta en 15 minutos.' },
}));

app.use('/api', rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  max:       parseInt(process.env.RATE_LIMIT_MAX)       || 100,
  message:   { ok: false, mensaje: 'Demasiadas solicitudes.' },
}));

// ── CORS ───────────────────────────────────────────────────
app.use(cors({
  origin:      process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : '*',
  credentials: true,
  methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
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

app.listen(PORT, () => {
  console.log(`\n🚀 Kinventory API corriendo en http://localhost:${PORT}`);
  console.log(`📡 Entorno: ${process.env.NODE_ENV || 'development'}\n`);
});
