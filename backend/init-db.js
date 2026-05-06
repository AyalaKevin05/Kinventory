require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function initDB() {
  console.log('--- MODO DEBUG ---');
  // Usar una URL directa si está disponible, sino construirla
  const connectionString = process.env.MYSQL_URL || `mysql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;
  
  // Ocultamos la contraseña por seguridad en el log
  const safeLog = connectionString.replace(/:([^:@]+)@/, ':*****@');
  console.log(`Intentando conectar a: ${safeLog}`);

  try {
    const connection = await mysql.createConnection({
      uri: connectionString,
      multipleStatements: true,
      ssl: {
        rejectUnauthorized: false
      }
    });

    console.log('¡Conectado exitosamente!');

    console.log('Ejecutando schema.sql...');
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    if (schemaSql.includes('DELIMITER $$')) {
      const parts = schemaSql.split('DELIMITER $$');
      await connection.query(parts[0]); // Todo antes de los triggers
      
      const rest = parts[1].split('DELIMITER ;');
      const triggers = rest[0].split('$$').filter(t => t.trim().length > 0);
      
      for (const trigger of triggers) {
        await connection.query(trigger);
      }
      
      if (rest[1] && rest[1].trim().length > 0) {
        await connection.query(rest[1]); // Vistas después de los triggers
      }
    } else {
      await connection.query(schemaSql);
    }
    console.log('✅ schema.sql ejecutado correctamente.');

    console.log('Ejecutando seed.sql...');
    const seedPath = path.join(__dirname, '../database/seed.sql');
    const seedSql = fs.readFileSync(seedPath, 'utf8');
    await connection.query(seedSql);
    console.log('✅ seed.sql ejecutado correctamente.');

    await connection.end();
    console.log('Proceso finalizado. Conexión cerrada.');

  } catch (error) {
    console.error('\n❌ ERROR DETALLADO:');
    console.error('Mensaje:', error.message);
    console.error('Código:', error.code);
    console.error('¿Estás seguro de que la IP y el Puerto son los PÚBLICOS de la pestaña TCP Proxy?');
  }
}

initDB();
