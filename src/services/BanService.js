import UsersRepository from '../repositories/UsersRepository.js';
import pool from '../config/database.js';

class BanService {
  constructor() {
    this.usersRepo = new UsersRepository();
  }

  /**
   * Banea un usuario
   * @param {string} email - Email del usuario a banear
   * @param {object} banData - Datos del baneo
   * @param {string} banData.reason - Razón del baneo
   * @param {string} banData.description - Descripción del baneo
   * @param {Date|string|null} banData.bannedUntil - Fecha de expiración del baneo (null si es permanente)
   * @param {boolean} banData.isPermanent - Si el baneo es permanente
   */
  async banUser(email, banData) {
    const { reason, description, bannedUntil, isPermanent } = banData;

    // Convertir bannedUntil a Date si es string
    let bannedUntilDate = null;
    if (bannedUntil && !isPermanent) {
      bannedUntilDate = bannedUntil instanceof Date ? bannedUntil : new Date(bannedUntil);
    }

    // Guardar el baneo en la base de datos
    await this.usersRepo.banUser(email, {
      reason,
      description,
      bannedUntil: bannedUntilDate,
      isPermanent: isPermanent || false,
    });
  }

  /**
   * Desbanea un usuario
   * @param {string} email - Email del usuario a desbanear
   */
  async unbanUser(email) {
    // Eliminar el baneo de la base de datos
    await this.usersRepo.unbanUser(email);
  }

  /**
   * Verifica y procesa baneos expirados
   */
  async processExpiredBans() {
    try {
      // Obtener todos los baneos no permanentes con fecha de expiración
      const result = await pool.query(`
        SELECT email, banned_until
        FROM "usersBanned"
        WHERE is_permanent = false
          AND banned_until IS NOT NULL
          AND banned_until <= NOW()
      `);

      const expiredBans = result.rows;
      console.log(`Encontrados ${expiredBans.length} baneos expirados`);

      for (const ban of expiredBans) {
        await this.unbanUser(ban.email);
      }

      return { processed: expiredBans.length };
    } catch (error) {
      console.error('Error procesando baneos expirados:', error);
      throw error;
    }
  }
}

export default new BanService();

