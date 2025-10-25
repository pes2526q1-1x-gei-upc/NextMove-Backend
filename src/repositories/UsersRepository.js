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
        photo,
        birth_date as "birthDate",
        phone_number as "phoneNumber",
        preferred_mode as "preferredMode",
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
        photo,
        birth_date as "birthDate",
        phone_number as "phoneNumber",
        preferred_mode as "preferredMode",
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
    const { email, name, preferredMode } = userData;
    
    const result = await pool.query(`
      INSERT INTO users (email, name, preferred_mode)
      VALUES ($1, $2, $3)
      RETURNING 
        email,
        name,
        photo,
        birth_date as "birthDate",
        phone_number as "phoneNumber",
        preferred_mode as "preferredMode",
        bio_description as "bioDescription",
        TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as "createdAt"
    `, [email, name, preferredMode]);
    
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
    if (changingData.birthDate !== undefined) {
      fields.push(`birth_date = $${paramIndex++}`);
      values.push(changingData.birthDate);
    }
    if (changingData.phoneNumber !== undefined) {
      fields.push(`phone_number = $${paramIndex++}`);
      values.push(changingData.phoneNumber);
    }
    if (changingData.bioDescription !== undefined) {
      fields.push(`bio_description = $${paramIndex++}`);
      values.push(changingData.bioDescription);
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
        photo,
        birth_date as "birthDate",
        phone_number as "phoneNumber",
        preferred_mode as "preferredMode",
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
