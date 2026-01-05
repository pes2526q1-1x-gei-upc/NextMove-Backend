import UsersRepository from '../repositories/UsersRepository.js';
import FCMTokenRepository from '../repositories/FCMTokenRepository.js';
import NotificationService from './NotificationService.js';
import pool from '../config/database.js';

class BanService {
  constructor() {
    this.usersRepo = new UsersRepository();
    this.fcmTokenRepo = new FCMTokenRepository();
  }

  /**
   * Banea un usuario y envía notificación push
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

    // Obtener tokens FCM del usuario
    const tokens = await this.fcmTokenRepo.getTokensByUser(email);
    const fcmTokens = tokens.map(t => t.fcm_token);

    // Enviar notificación push
    if (fcmTokens.length > 0) {
      try {
        await NotificationService.sendBanNotification(fcmTokens, {
          reason,
          bannedUntil: bannedUntilDate ? bannedUntilDate.toISOString() : null,
          isPermanent: isPermanent || false,
        });
        console.log(`Notificación de baneo enviada a ${fcmTokens.length} dispositivo(s) del usuario ${email}`);
      } catch (error) {
        console.error(`Error enviando notificación de baneo a ${email}:`, error);
        // No lanzar error, el baneo ya se guardó
      }
    } else {
      console.log(`Usuario ${email} no tiene tokens FCM registrados, no se envió notificación`);
    }
  }

  /**
   * Desbanea un usuario y envía notificación push
   * @param {string} email - Email del usuario a desbanear
   */
  async unbanUser(email) {
    // Eliminar el baneo de la base de datos
    await this.usersRepo.unbanUser(email);

    // Obtener tokens FCM del usuario
    const tokens = await this.fcmTokenRepo.getTokensByUser(email);
    const fcmTokens = tokens.map(t => t.fcm_token);

    // Enviar notificación push
    if (fcmTokens.length > 0) {
      try {
        await NotificationService.sendUnbanNotification(fcmTokens);
        console.log(`Notificación de desbaneo enviada a ${fcmTokens.length} dispositivo(s) del usuario ${email}`);
      } catch (error) {
        console.error(`Error enviando notificación de desbaneo a ${email}:`, error);
        // No lanzar error, el desbaneo ya se realizó
      }
    } else {
      console.log(`Usuario ${email} no tiene tokens FCM registrados, no se envió notificación`);
    }
  }

  /**
   * Verifica y procesa baneos expirados
   * Envía notificaciones a usuarios cuyo baneo ha expirado
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

