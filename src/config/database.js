import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
dotenv.config();


const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  ssl: {
    rejectUnauthorized: false
  },
  max: 50,
  min:2,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000, // Aumentado a 10 segundos
  statement_timeout: 30000, // Timeout para queries individuales
  allowExitOnIdle: true
});

pool.on('connect', () => {
  console.log('Conectado a la base de datos PostgreSQL pool');
});

pool.on('error', (err) => {
  console.error('Error al conectar con la base de datos PostgreSQL:', err);
});


export default pool;
