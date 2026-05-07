require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function fixPasswords() {
  console.log('Arreglando contraseñas de los usuarios por defecto...');
  
  const connectionString = process.env.MYSQL_URL || `mysql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

  try {
    const connection = await mysql.createConnection({
      uri: connectionString,
      ssl: { rejectUnauthorized: false }
    });

    // Generar un hash real para 'Admin123!'
    const hashReal = await bcrypt.hash('Admin123!', 10);

    // Actualizar todos los usuarios para que tengan la misma contraseña por ahora
    await connection.query('UPDATE usuarios SET contrasena = ?', [hashReal]);

    console.log('✅ Contraseñas actualizadas con éxito.');
    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixPasswords();
