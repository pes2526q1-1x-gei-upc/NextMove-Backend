// src/repositories/UsersRepository.js
import  pool  from '../config/database.js';

class UsersRepository {
  
  /**
   * Obtener todos los usuarios
   */
  async getAllUsers() {
    const result = await pool.query(`
      SELECT
        id,
        email,
        name AS "name",
        nickname,
        photo,
        birth_date AS "birthDate",
        phone_number AS "phoneNumber",
        preferred_mode AS "preferredMode",
        preferred_language AS "preferredLanguage",
        bio_description AS "bioDescription",
        TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "createdAt"
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
        name AS "name",
        nickname,
        photo,
        TO_CHAR(birth_date::date, 'YYYY-MM-DD') AS "birthDate", 
        phone_number AS "phoneNumber",
        preferred_mode AS "preferredMode",
        preferred_language AS "preferredLanguage",
        bio_description AS "bioDescription",
        TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "createdAt"
      FROM users
      WHERE email = $1
    `, [email]);
    return result.rows[0];
  }

  /**
   * Obtener usuario por nickname
   */
  async getUserByNickname(nickname) {
    const result = await pool.query(`
      SELECT 
        email,
        name AS "name",
        nickname,
        photo,
        birth_date AS "birthDate",
        phone_number AS "phoneNumber",
        preferred_mode AS "preferredMode",
        preferred_language AS "preferredLanguage",
        bio_description AS "bioDescription",
        TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "createdAt"
      FROM users
      WHERE nickname = $1
    `, [nickname]);
    return result.rows[0];
  }

  /**
   * Crear nuevo usuario
   */
  async createUser(userData) {
    const { email, name, nickname, phoneNumber, preferredMode, preferredLanguage, bioDescription, birthDate } = userData;
    console.log('Creating user with data:', userData);

    if (!email || !name || !nickname || !preferredMode) {
      throw new Error('Los campos email, name, nickname y preferredMode son obligatorios');
    }

    try {
      console.log('Birth date: ', birthDate);
      const result = await pool.query(`
        INSERT INTO users (
          email,
          name,
          nickname,
          phone_number,
          preferred_mode,
          preferred_language,
          bio_description,
          birth_date
        )
        VALUES ($1, $2, $3, $4, $5::mode , $6, $7, $8::date)
        RETURNING 
          email,
          name AS "name",
          nickname,
          photo,
          phone_number AS "phoneNumber",
          preferred_mode AS "preferredMode",
          preferred_language AS "preferredLanguage",
          bio_description AS "bioDescription",
          TO_CHAR(birth_date::date, 'YYYY-MM-DD') AS "birthDate",
          TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "createdAt"
      `, [email, name, nickname, phoneNumber || null, preferredMode, preferredLanguage || "ESP", bioDescription || null, birthDate || null]); 

      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') {
        if (error.constraint === 'users_pkey') {
          throw new Error(`Ya existe un usuario con el email: ${email}`);
        }
        if (error.constraint === 'users_nickname_key') {
          throw new Error(`Ya existe un usuario con el nickname: ${nickname}`);
        }
      }
      throw error;
    }
  }

  /**
   * Actualizar usuario
   */
  async updateUser(email, changingData) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (changingData.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(changingData.name);
    }
    if (changingData.nickname !== undefined) {
      fields.push(`nickname = $${paramIndex++}`);
      values.push(changingData.nickname);
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
    if (changingData.preferredMode !== undefined) {
      fields.push(`preferred_mode = $${paramIndex++}::mode`);
      values.push(changingData.preferredMode);
    }
    if (changingData.preferredLanguage !== undefined) {
      fields.push(`preferred_language = $${paramIndex++}`);
      values.push(changingData.preferredLanguage);
    }
    if (changingData.photo !== undefined) {
      fields.push(`photo = $${paramIndex++}`);
      values.push(changingData.photo);
    }

    if (fields.length === 0) {
      return this.getUserByEmail(email);
    }

    values.push(email);
    
    const query = `
      UPDATE users 
      SET ${fields.join(', ')}
      WHERE email = $${paramIndex}
      RETURNING 
        email,
        name AS "name",
        nickname,
        photo,
        TO_CHAR(birth_date::date, 'YYYY-MM-DD') AS "birthDate",
        phone_number AS "phoneNumber",
        preferred_mode AS "preferredMode",
        preferred_language AS "preferredLanguage", 
        bio_description AS "bioDescription",
        TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "createdAt"
    `;

    const result = await pool.query(query, values);
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