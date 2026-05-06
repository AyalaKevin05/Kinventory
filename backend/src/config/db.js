// config/db.js — Pool de conexiones MySQL
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host:            process.env.DB_HOST     || 'localhost',
  port:            process.env.DB_PORT     || 3306,
  database:        process.env.DB_NAME     || 'kinventory',
  user:            process.env.DB_USER     || 'root',
  password:        process.env.DB_PASSWORD || '',
  connectionLimit: process.env.DB_CONNECTION_LIMIT || 10,
  waitForConnections: true,
  queueLimit:      0,
  charset:         'utf8mb4',
  timezone:        'local',
});

// Verificar conexión al iniciar
const verificarConexion = async () => {
  try {
    const conn = await pool.getConnection();
    console.log('✅ Conectado a MySQL — Base de datos:', process.env.DB_NAME);
    conn.release();
  } catch (err) {
    console.error('❌ Error conectando a MySQL:', err.message);
    process.exit(1);
  }
};

verificarConexion();

module.exports = pool;
