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
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
  console.log('Conectado a la base de datos PostgreSQL pool');
});

pool.on('error', (err) => {
  console.error('Error al conectar con la base de datos PostgreSQL:', err);
});


export default pool;