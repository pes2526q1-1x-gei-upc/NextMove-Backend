// src/scripts/setupUsersDB.js
import pool from '../config/database.js';

async function setupUsersDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('Borrando tablas de usuarios...');
    
    await client.query(`
      DROP TABLE IF EXISTS bloqueados CASCADE;
      DROP TABLE IF EXISTS amigos CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
      DROP TYPE IF EXISTS preferido CASCADE;
      DROP TYPE IF EXISTS mode CASCADE;
    `);
    
    console.log('Se han podido eliminar las tablas de usuarios si existían.');
    console.log('Creando tablas de usuarios...');
    
    // Crear enum Mode (CAR, BIKE)
    await client.query(`
      CREATE TYPE mode AS ENUM('CAR', 'BIKE');
    `);
    
    // Crear tabla users con estructura compatible con GraphQL
    await client.query(`
      CREATE TABLE users (
        email VARCHAR(150) PRIMARY KEY,
        name VARCHAR(100),
        nickmane VARCHAR(50) UNIQUE,
        photo VARCHAR(255),
        birth_date VARCHAR(50),
        phone_number VARCHAR(20),
        preferred_mode mode,
        preferred_language VARCHAR(20),
        bio_description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX idx_users_email ON users(email);
      CREATE INDEX idx_users_created_at ON users(created_at DESC);
    `);
    
    console.log('✅ Tablas de usuarios creadas');
    
    // Datos de prueba
    await client.query(`
      INSERT INTO users (email, name, preferred_mode, bio_description, birth_date, phone_number) 
      VALUES 
        ('juan@example.com', 'Juan Pérez', 'CAR', 'Usuario de prueba 1', '1990-05-15', '123456789'),
        ('maria@example.com', 'María García', 'BIKE', 'Usuario de prueba 2', '1995-08-20', '987654321'),
        ('ana@test.com', 'Ana García', 'CAR', 'Usuario de prueba 3', '1998-03-10', '555666777')
      ON CONFLICT (email) DO NOTHING;
    `);
    
    console.log('✅ Datos de prueba insertados');
    
    // Verificar
    const result = await client.query('SELECT COUNT(*) as count FROM users');
    console.log(`📊 Total usuarios: ${result.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
  }
}

setupUsersDatabase()
  .then(() => {
    console.log('🎉 Base de datos de usuarios lista');
    process.exit(0);
  })
  .catch((err) => {
    console.error('💥 Error:', err);
    process.exit(1);
  });
