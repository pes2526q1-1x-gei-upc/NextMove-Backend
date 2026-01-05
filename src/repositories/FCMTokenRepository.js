import pool from '../config/database.js';

class FCMTokenRepository {
  // Obtener todos los tokens FCM de un usuario
  async getTokensByUser(email) {
    const result = await pool.query(`
      SELECT id, user_email, fcm_token, device_id, platform, created_at, updated_at
      FROM user_fcm_tokens
      WHERE user_email = $1
      ORDER BY updated_at DESC
    `, [email]);
    return result.rows;
  }

  // Obtener un token por token FCM
  async getTokenByFCMToken(fcmToken) {
    const result = await pool.query(`
      SELECT id, user_email, fcm_token, device_id, platform, created_at, updated_at
      FROM user_fcm_tokens
      WHERE fcm_token = $1
    `, [fcmToken]);
    return result.rows[0] || null;
  }

  // Registrar o actualizar un token FCM
  async upsertToken(email, fcmToken, deviceId = null, platform = null) {
    const result = await pool.query(`
      INSERT INTO user_fcm_tokens (user_email, fcm_token, device_id, platform, updated_at)
      VALUES ($1, $2, $3, $4, current_timestamp)
      ON CONFLICT (fcm_token) 
      DO UPDATE SET 
        user_email = EXCLUDED.user_email,
        device_id = COALESCE(EXCLUDED.device_id, user_fcm_tokens.device_id),
        platform = COALESCE(EXCLUDED.platform, user_fcm_tokens.platform),
        updated_at = current_timestamp
      RETURNING id, user_email, fcm_token, device_id, platform, created_at, updated_at
    `, [email, fcmToken, deviceId, platform]);
    return result.rows[0];
  }

  // Eliminar un token FCM
  async deleteToken(fcmToken) {
    const result = await pool.query(`
      DELETE FROM user_fcm_tokens
      WHERE fcm_token = $1
    `, [fcmToken]);
    return result.rowCount > 0;
  }

  // Eliminar todos los tokens de un usuario
  async deleteTokensByUser(email) {
    const result = await pool.query(`
      DELETE FROM user_fcm_tokens
      WHERE user_email = $1
    `, [email]);
    return result.rowCount > 0;
  }

  // Obtener todos los tokens activos (para notificaciones masivas)
  async getAllActiveTokens() {
    const result = await pool.query(`
      SELECT DISTINCT user_email, fcm_token, platform
      FROM user_fcm_tokens
      ORDER BY user_email
    `);
    return result.rows;
  }

  // Obtener tokens de usuarios específicos
  async getTokensByUsers(emails) {
    if (emails.length === 0) return [];
    const result = await pool.query(`
      SELECT DISTINCT user_email, fcm_token, platform
      FROM user_fcm_tokens
      WHERE user_email = ANY($1)
    `, [emails]);
    return result.rows;
  }
}

export default FCMTokenRepository;

