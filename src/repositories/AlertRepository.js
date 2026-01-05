import pool from '../config/database.js';

class AlertRepository {
  // Obtener todas las alertas de un usuario
  async getAlertsByUser(email) {
    const result = await pool.query(`
      SELECT 
        sa.id,
        sa.user_email,
        sa.station_id,
        sa.horas,
        sa.dias_semana,
        sa.activa,
        sa.created_at,
        sa.updated_at,
        eb.nombre as station_nombre,
        eb.direccion as station_direccion
      FROM station_alerts sa
      JOIN estacionbicing eb ON sa.station_id = eb.id
      WHERE sa.user_email = $1
      ORDER BY sa.created_at DESC
    `, [email]);
    return result.rows;
  }

  // Obtener una alerta por ID
  async getAlertById(id, email) {
    const result = await pool.query(`
      SELECT 
        sa.id,
        sa.user_email,
        sa.station_id,
        sa.horas,
        sa.dias_semana,
        sa.activa,
        sa.created_at,
        sa.updated_at,
        eb.nombre as station_nombre,
        eb.direccion as station_direccion
      FROM station_alerts sa
      JOIN estacionbicing eb ON sa.station_id = eb.id
      WHERE sa.id = $1 AND sa.user_email = $2
    `, [id, email]);
    return result.rows[0] || null;
  }

  // Crear una nueva alerta
  async createAlert(email, stationId, horas, diasSemana) {
    const result = await pool.query(`
      INSERT INTO station_alerts (user_email, station_id, horas, dias_semana)
      VALUES ($1, $2, $3, $4)
      RETURNING id, user_email, station_id, horas, dias_semana, activa, created_at, updated_at
    `, [email, stationId, horas, diasSemana]);
    return result.rows[0];
  }

  // Actualizar una alerta
  async updateAlert(id, email, horas, diasSemana, activa) {
    const result = await pool.query(`
      UPDATE station_alerts
      SET horas = $1, dias_semana = $2, activa = $3, updated_at = current_timestamp
      WHERE id = $4 AND user_email = $5
      RETURNING id, user_email, station_id, horas, dias_semana, activa, created_at, updated_at
    `, [horas, diasSemana, activa, id, email]);
    return result.rows[0] || null;
  }

  // Eliminar una alerta
  async deleteAlert(id, email) {
    const result = await pool.query(`
      DELETE FROM station_alerts
      WHERE id = $1 AND user_email = $2
    `, [id, email]);
    return result.rowCount > 0;
  }

  // Activar/desactivar una alerta
  async toggleAlert(id, email, activa) {
    const result = await pool.query(`
      UPDATE station_alerts
      SET activa = $1, updated_at = current_timestamp
      WHERE id = $2 AND user_email = $3
      RETURNING id, user_email, station_id, horas, dias_semana, activa, created_at, updated_at
    `, [activa, id, email]);
    return result.rows[0] || null;
  }
}

export default AlertRepository;

