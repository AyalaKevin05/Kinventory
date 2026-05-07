require('dotenv').config();
const mysql = require('mysql2/promise');

async function test() {
  const connectionString = process.env.MYSQL_URL || `mysql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;
  const connection = await mysql.createConnection({
    uri: connectionString,
    ssl: { rejectUnauthorized: false }
  });
  
  const [cats] = await connection.query('SELECT * FROM categorias');
  console.log('Categories count:', cats.length);
  if (cats.length > 0) console.log(cats[0]);
  
  await connection.end();
}
test();
