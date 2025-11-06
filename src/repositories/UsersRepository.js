// src/repositories/UsersRepository.js
import pool from '../config/database.js';

class UsersRepository {
  
  /**
   * Obtener todos los usuarios
   */
  async getAllUsers() {
    const result = await pool.query(`
      SELECT 
        email,
        name,
        nickname,
        photo,
        birth_date as "birthDate",
        phone_number as "phoneNumber",
        preferred_mode as "preferredMode",
        preferred_language,
        bio_description as "bioDescription",
        TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as "createdAt"
      FROM users
      ORDER BY created_at DESC
    `);
    return result.rows;
  }

  /**
   * Obtener usuario por email
   */
  async getUserByEmail(email) {
    const result = await pool.query(`
      SELECT 
        email,
        name,
        nickname,
        photo,
        birth_date as "birthDate",
        phone_number as "phoneNumber",
        preferred_mode as "preferredMode",
        preferred_language,
        bio_description as "bioDescription",
        TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as "createdAt"
      FROM users
      WHERE email = $1
    `, [email]);
    return result.rows[0];
  }

  /**
   * Crear nuevo usuario
   */
async createUser(userData) {
  const { email } = userData;

  const result = await pool.query(`
    INSERT INTO users (email)
    VALUES ($1)
    RETURNING 
      email,
      name,
      nickname,
      photo,
      birth_date AS "birthDate",
      phone_number AS "phoneNumber",
      preferred_mode AS "preferredMode",
      preferred_language,
      bio_description AS "bioDescription",
      TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "createdAt"
  `, [email]); 

  return result.rows[0];
}

  /**
   * Actualizar usuario
   */
  async updateUser(email, changingData) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    // Solo actualizar campos que vienen en changingData
    if (changingData.preferredMode !== undefined) {
      fields.push(`preferred_mode = $${paramIndex++}`);
      values.push(changingData.preferredMode);
    }
    if (changingData.photo !== undefined) {
      fields.push(`photo = $${paramIndex++}`);
      values.push(changingData.photo);
    }
    if (changingData.phoneNumber !== undefined) {
      fields.push(`phone_number = $${paramIndex++}`);
      values.push(changingData.phoneNumber);
    }
    if (changingData.bioDescription !== undefined) {
      fields.push(`bio_description = $${paramIndex++}`);
      values.push(changingData.bioDescription);
    }
    if(changingData.preferredLanguage !== undefined) {
      fields.push(`preferred_language = $${paramIndex++}`);
      values.push(changingData.preferredLanguage);
    }

    if (fields.length === 0) {
      // No hay cambios, devolver usuario actual
      return this.getUserByEmail(email);
    }

    values.push(email);
    
    const result = await pool.query(`
      UPDATE users 
      SET ${fields.join(', ')}
      WHERE email = $${paramIndex}
      RETURNING 
        email,
        name,
        nickname,
        photo,
        birth_date as "birthDate",
        phone_number as "phoneNumber",
        preferred_mode as "preferredMode",
        preferred_language,
        bio_description as "bioDescription",
        TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as "createdAt"
    `, values);
    
    return result.rows[0];
  }

  /**
   * Eliminar usuario
   */
  async deleteUser(email) {
    const result = await pool.query(`
      DELETE FROM users WHERE email = $1 RETURNING email
    `, [email]);
    
    return result.rows.length > 0;
  }
}

export default UsersRepository;
