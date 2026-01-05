import pool from '../config/database.js';
import FCMTokenRepository from '../repositories/FCMTokenRepository.js';
import NotificationService from '../services/NotificationService.js';
import EstacionDeBicingSyncWorker from './EstacionDeBicingSyncWorker.js';

class AlertNotificationWorker {
  constructor() {
    this.isRunning = false;
    this.checkInterval = 1 * 60 * 1000; // Verificar cada 1 minuto
    this.intervalId = null;
    this.fcmTokenRepo = new FCMTokenRepository();
    this.lastCheckTime = null;
    // Mapa para rastrear alertas enviadas: clave = "alertId:hora", valor = timestamp
    this.sentAlerts = new Map();
    this.CLEANUP_INTERVAL = 60 * 60 * 1000; // Limpiar mapa cada hora
    this.consecutiveErrors = 0; // Contador de errores consecutivos
    this.maxConsecutiveErrors = 5; // Máximo de errores antes de aumentar el intervalo
  }

  /**
   * Inicia el worker
   */
  start() {
    if (this.isRunning) {
      console.log('AlertNotificationWorker: Ya está en ejecución.');
      return;
    }
    this.isRunning = true;
    console.log('AlertNotificationWorker: Worker iniciado.');
    this.checkAlerts();
  }

  /**
   * Detiene el worker
   */
  stop() {
    if (!this.isRunning) return;
    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('AlertNotificationWorker: Worker detenido.');
  }

  /**
   * Verifica las alertas y envía notificaciones
   */
  async checkAlerts() {
    if (!this.isRunning) return;

    try {
      console.log('AlertNotificationWorker: Verificando alertas...');
      this.lastCheckTime = new Date();

      // Obtener todas las alertas activas
      const allAlerts = await this.getAllActiveAlerts();
      
      // Si la consulta fue exitosa, resetear el contador de errores
      this.consecutiveErrors = 0;
      
      if (allAlerts.length === 0) {
        console.log('AlertNotificationWorker: No hay alertas activas.');
        this.scheduleNextCheck();
        return;
      }

      // Obtener estaciones actualizadas del cache
      const estaciones = EstacionDeBicingSyncWorker.getEstacionesCache();
      
      if (!estaciones || estaciones.length === 0) {
        console.log('AlertNotificationWorker: No hay estaciones en cache.');
        this.scheduleNextCheck();
        return;
      }

      // Filtrar alertas que deben ejecutarse ahora
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentDayOfWeek = now.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
      // Convertir a formato de la BD: 0 = Lunes, 6 = Domingo
      const dayIndex = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;

      const alertsToSend = [];

      for (const alert of allAlerts) {
        // Verificar si el día de la semana coincide
        if (!alert.dias_semana.includes(dayIndex)) {
          continue;
        }

        // Verificar si alguna hora coincide (solo en el minuto exacto)
        const matchedHour = alert.horas.find(hora => {
          const [hour, minute] = hora.split(':').map(Number);
          // Verificar si estamos en la hora y minuto exactos (sin margen)
          return hour === currentHour && minute === currentMinute;
        });

        if (matchedHour) {
          // Crear clave única para esta alerta y hora: "alertId:hour:minute"
          const [alertHour, alertMinute] = matchedHour.split(':').map(Number);
          const alertKey = `${alert.id}:${alertHour}:${alertMinute}`;
          
          // Verificar si ya enviamos esta alerta en esta hora (cooldown de 5 minutos)
          const lastSent = this.sentAlerts.get(alertKey);
          const nowTime = now.getTime();
          
          // Solo enviar si no la hemos enviado en los últimos 5 minutos
          if (!lastSent || (nowTime - lastSent) > 5 * 60 * 1000) {
            // Buscar la estación en el cache
            const estacion = estaciones.find(e => e.id === alert.station_id);
            
            if (estacion) {
              alertsToSend.push({
                alert,
                estacion,
                alertKey,
              });
              // Marcar como enviada
              this.sentAlerts.set(alertKey, nowTime);
            }
          }
        }
      }

      if (alertsToSend.length === 0) {
        console.log('AlertNotificationWorker: No hay alertas que ejecutar en este momento.');
        this.scheduleNextCheck();
        return;
      }

      console.log(`AlertNotificationWorker: ${alertsToSend.length} alertas a enviar.`);

      // Obtener tokens FCM de los usuarios
      const userEmails = [...new Set(alertsToSend.map(a => a.alert.user_email))];
      const tokensMap = await this.getTokensForUsers(userEmails);

      // Preparar notificaciones
      const notificationsToSend = [];

      for (const { alert, estacion } of alertsToSend) {
        const tokens = tokensMap[alert.user_email] || [];
        
        if (tokens.length === 0) {
          console.log(`AlertNotificationWorker: Usuario ${alert.user_email} no tiene tokens FCM registrados.`);
          continue;
        }

        const espaciosDisponibles = estacion.anclajesDisponibles || 0;

        for (const token of tokens) {
          notificationsToSend.push({
            fcmToken: token.fcm_token,
            stationData: {
              stationId: alert.station_id,
              stationNombre: estacion.nombre || alert.station_nombre || `Estación ${alert.station_id}`,
              espaciosDisponibles,
            },
          });
        }
      }

      if (notificationsToSend.length === 0) {
        console.log('AlertNotificationWorker: No hay notificaciones para enviar.');
        this.scheduleNextCheck();
        return;
      }

      // Enviar notificaciones
      console.log(`AlertNotificationWorker: Enviando ${notificationsToSend.length} notificaciones...`);
      const result = await NotificationService.sendStationAlertsBatch(notificationsToSend);

      if (result.success) {
        console.log(`AlertNotificationWorker: ${result.sent} notificaciones enviadas, ${result.failed} fallaron.`);
        
        // Limpiar tokens inválidos si hay fallos
        if (result.failed > 0 && result.responses) {
          await this.cleanupInvalidTokens(result.responses, notificationsToSend);
        }
      } else {
        console.error('AlertNotificationWorker: Error enviando notificaciones:', result.error);
      }

    } catch (error) {
      this.consecutiveErrors++;
      console.error('AlertNotificationWorker: Error verificando alertas:', error.message);
      
      // Si hay muchos errores consecutivos, aumentar el intervalo de verificación
      if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
        const extendedInterval = this.checkInterval * 3; // 3 minutos en lugar de 1
        console.warn(`AlertNotificationWorker: ${this.consecutiveErrors} errores consecutivos. Aumentando intervalo a ${extendedInterval / 1000}s`);
        this.scheduleNextCheck(extendedInterval);
      } else {
        this.scheduleNextCheck();
      }
    }
  }

  /**
   * Obtiene todas las alertas activas agrupadas por usuario
   */
  async getAllActiveAlerts() {
    const result = await pool.query(`
      SELECT 
        sa.id,
        sa.user_email,
        sa.station_id,
        sa.horas,
        sa.dias_semana,
        sa.activa,
        eb.nombre as station_nombre,
        eb.direccion as station_direccion
      FROM station_alerts sa
      JOIN estacionbicing eb ON sa.station_id = eb.id
      WHERE sa.activa = true
      ORDER BY sa.user_email, sa.station_id
    `);
    return result.rows;
  }

  /**
   * Obtiene tokens FCM agrupados por usuario
   */
  async getTokensForUsers(userEmails) {
    const tokens = await this.fcmTokenRepo.getTokensByUsers(userEmails);
    const tokensMap = {};

    for (const token of tokens) {
      if (!tokensMap[token.user_email]) {
        tokensMap[token.user_email] = [];
      }
      tokensMap[token.user_email].push(token);
    }

    return tokensMap;
  }

  /**
   * Limpia tokens FCM inválidos
   */
  async cleanupInvalidTokens(responses, notifications) {
    const invalidTokens = [];

    for (let i = 0; i < responses.length; i++) {
      const response = responses[i];
      if (!response.success) {
        const errorCode = response.error?.code;
        if (errorCode === 'messaging/invalid-registration-token' ||
            errorCode === 'messaging/registration-token-not-registered') {
          invalidTokens.push(notifications[i].fcmToken);
        }
      }
    }

    if (invalidTokens.length > 0) {
      console.log(`AlertNotificationWorker: Limpiando ${invalidTokens.length} tokens inválidos.`);
      for (const token of invalidTokens) {
        try {
          await this.fcmTokenRepo.deleteToken(token);
        } catch (error) {
          console.error('AlertNotificationWorker: Error eliminando token:', error);
        }
      }
    }
  }

  /**
   * Programa la siguiente verificación
   */
  scheduleNextCheck(customInterval = null) {
    if (!this.isRunning) return;
    const interval = customInterval || this.checkInterval;
    this.intervalId = setTimeout(() => this.checkAlerts(), interval);
    
    // Limpiar mapa de alertas enviadas periódicamente
    // Mantener solo las de la última hora
    const cleanupTimeout = setTimeout(() => {
      const now = Date.now();
      for (const [key, timestamp] of this.sentAlerts.entries()) {
        if (now - timestamp > this.CLEANUP_INTERVAL) {
          this.sentAlerts.delete(key);
        }
      }
    }, this.CLEANUP_INTERVAL);
    
    // Evitar que el timeout se acumule
    if (this._cleanupTimeout) {
      clearTimeout(this._cleanupTimeout);
    }
    this._cleanupTimeout = cleanupTimeout;
  }
}

// Exporta singleton
const alertNotificationWorker = new AlertNotificationWorker();
export default alertNotificationWorker;

