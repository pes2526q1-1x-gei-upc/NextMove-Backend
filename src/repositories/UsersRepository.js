import pool from '../config/database.js';

console.log('POOL EN UsersRepository ES UN OBJETO?', !!pool);
console.log('TIPO DE POOL:', typeof pool);

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
    const result = await pool.query(
      `SELECT
         email,
         name AS "name",
         nickname,
         photo,
         TO_CHAR(birth_date::date, 'YYYY-MM-DD') AS "birthDate",
         phone_number AS "phoneNumber",
         preferred_mode AS "preferredMode",
         preferred_language AS "preferredLanguage",
         bio_description AS "bioDescription",
         TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "createdAt",
         reg_with_google AS "regWithGoogle"
       FROM users
       WHERE email = $1`,
      [email]
    );

    const user = result.rows[0];
    if (!user) return null;

    // Comprobar si está baneado
    const banned = await this.isUserBanned(email);

    return {
      ...user,
      isBanned: !!banned,
      banInfo: banned ? {
        reason: banned.reason,
        description: banned.description,
        bannedUntil: banned.banned_until ? banned.banned_until.toISOString() : null,
        isPermanent: banned.is_permanent,
        createdAt: banned.created_at.toISOString(),
      } : null,
    };
  }

  /**
   * Obtener usuario por nickname
   */
  async getUsersByNickname(nickname) {
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
      WHERE nickname ILIKE $1
      ORDER BY nickname
    `, [`${nickname}%`]);

    // console.log("Datos:", result.rows);

    return result.rows;
  }

  async existsUserByNickname(nickname) {
    const result = await pool.query(`
      SELECT 1
      FROM users
      WHERE nickname = $1
    `, [nickname]);
    return result.rows.length > 0;
  }

  /**
   * Crear nuevo usuario
   */
  async createUser(userData) {
    const {
      email,
      photo,
      name,
      nickname,
      phoneNumber,
      preferredMode,
      preferredLanguage,
      bioDescription,
      birthDate,
      regWithGoogle,
    } = userData;

    console.log('Creating user with data:', userData);

    if (!email || !name || !nickname || !preferredMode || regWithGoogle === undefined) {
      throw new Error('Los campos email, name, nickname, preferredMode y regWithGoogle son obligatorios');
    }

    try {
      console.log('Birth date: ', birthDate);
      const result = await pool.query(
        `
      INSERT INTO users (
        email,
        name,
        nickname,
        photo,
        phone_number,
        preferred_mode,
        preferred_language,
        bio_description,
        birth_date,
        reg_with_google
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6::"MODE",
        $7,
        $8,
        $9::date,
        $10
      )
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
        TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "createdAt",
        reg_with_google AS "regWithGoogle"
      `,
        [
          email,
          name,
          nickname,
          photo || null,
          phoneNumber || null,
          preferredMode,
          preferredLanguage || 'ESP',
          bioDescription || null,
          birthDate || null,
          regWithGoogle,
        ]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error en createUser (DB):', error);
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
      fields.push(`preferred_mode = $${paramIndex++}::"MODE"`);
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

  async getUserSearchHistory(email) {
    const result = await pool.query(`
      SELECT texto
      FROM search_history
      WHERE email = $1
      ORDER BY created_at DESC
      LIMIT 5
    `, [email]);
    return result.rows.map(row => row.texto);
  }

  async addUserSearchHistory(email, texto) {
    await pool.query(`
      INSERT INTO search_history (email, texto)
      VALUES ($1, $2)
    `, [email, texto]);
  }

  async isUserBanned(email) {
    const result = await pool.query(
      `SELECT email, reason, description, banned_until, is_permanent, created_at
     FROM "usersBanned"
     WHERE email = $1`,
      [email]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const banInfo = result.rows[0];
    
    // Si es permanente, siempre está baneado
    if (banInfo.is_permanent) {
      return banInfo;
    }
    
    // Si tiene fecha de expiración, verificar si ya expiró
    if (banInfo.banned_until) {
      const now = new Date();
      const bannedUntil = new Date(banInfo.banned_until);
      
      // Si ya expiró, no está baneado
      if (now >= bannedUntil) {
        // Eliminar el baneo expirado
        await this.unbanUser(email);
        return null;
      }
    }
    
    return banInfo;
  }

  async banUser(email, { reason, description, bannedUntil, isPermanent }) {
    await pool.query(
      `INSERT INTO "usersBanned" (email, reason, description, banned_until, is_permanent)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (email) DO UPDATE
     SET reason = EXCLUDED.reason,
         description = EXCLUDED.description,
         banned_until = EXCLUDED.banned_until,
         is_permanent = EXCLUDED.is_permanent`,
      [email, reason, description || null, bannedUntil || null, isPermanent || false]
    );
  }

  async unbanUser(email) {
    await pool.query(
      `DELETE FROM "usersBanned" WHERE email = $1`,
      [email]
    );
  }




}



export default UsersRepository;
