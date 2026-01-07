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

// Gracefully erase idle connections. 
setInterval(() => {
  const idleCount = pool.idleCount;
  const totalCount = pool.totalCount;
  const waitingCount = pool.waitingCount;
  
  console.log(`[Pool Status] Total: ${totalCount}, Idle: ${idleCount}, Waiting: ${waitingCount}`);
  
  if (idleCount > 10) {
    console.warn(`[Pool Warning] Too much idle connections (${idleCount}). Possible memory leak.`);
  }
}, 60000); 

pool.on('connect', () => {
  console.log('Conectado a la base de datos PostgreSQL pool');
});

pool.on('error', (err) => {
  console.error('Error al conectar con la base de datos PostgreSQL:', err);
});


export default pool;
