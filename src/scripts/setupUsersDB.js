// src/scripts/setupUsersDB.js
import pool from '../config/database.js';

async function setupUsersDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🗑️  Limpiando tablas de usuarios...');
    
    await client.query(`
      DROP TABLE IF EXISTS bloqueados CASCADE;
      DROP TABLE IF EXISTS amigos CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
      DROP TYPE IF EXISTS preferido CASCADE;
    `);
    
    console.log('✅ Tablas antiguas eliminadas');
    console.log('🔨 Creando estructura de usuarios...');
    
    await client.query(`
      CREATE TYPE preferido AS ENUM('electrico','bici');
      
      CREATE TABLE users (
        id VARCHAR(20) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        mail VARCHAR(150) NOT NULL UNIQUE,
        photo VARCHAR(100),
        fecha_nacimiento DATE NOT NULL,
        fecha_registro DATE NOT NULL DEFAULT CURRENT_DATE,
        preferido preferido NOT NULL,
        CHECK (fecha_registro >= fecha_nacimiento)
      );
      
      CREATE TABLE amigos(
        id1 VARCHAR(20),
        id2 VARCHAR(20),
        PRIMARY KEY(id1, id2),
        FOREIGN KEY (id1) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (id2) REFERENCES users(id) ON DELETE CASCADE,
        CHECK (id1 < id2)
      );
      
      CREATE TABLE bloqueados(
        id1 VARCHAR(20),
        id2 VARCHAR(20),
        PRIMARY KEY(id1, id2),
        FOREIGN KEY (id1) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (id2) REFERENCES users(id) ON DELETE CASCADE,
        CHECK (id1 <> id2)
      );
      
      CREATE INDEX idx_users_mail ON users(mail);
      CREATE INDEX idx_amigos_id1 ON amigos(id1);
      CREATE INDEX idx_amigos_id2 ON amigos(id2);
    `);
    
    console.log('✅ Tablas de usuarios creadas');
    
    // Datos de prueba
    await client.query(`
      INSERT INTO users (id, name, mail, fecha_nacimiento, preferido) 
      VALUES 
        ('user1', 'Eric Moreno', 'eric@test.com', '2000-01-01', 'electrico'),
        ('user2', 'Test User', 'test@test.com', '1995-05-05', 'bici'),
        ('user3', 'Ana García', 'ana@test.com', '1998-03-10', 'electrico')
      ON CONFLICT (id) DO NOTHING;
      
      INSERT INTO amigos (id1, id2) VALUES ('user1', 'user2')
      ON CONFLICT DO NOTHING;
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
