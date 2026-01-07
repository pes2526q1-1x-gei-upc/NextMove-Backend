import pool from '../config/database.js';
import FCMTokenRepository from '../repositories/FCMTokenRepository.js';
import NotificationService from '../services/NotificationService.js';
import EstacionDeBicingSyncWorker from './EstacionDeBicingSyncWorker.js';

class AlertNotificationWorker {
  constructor() {
    this.isRunning = false;
    this.checkInterval = 2 * 60 * 1000; // Verificar cada 2 minutos (reducido de 1 minuto)
    this.intervalId = null;
    this.fcmTokenRepo = new FCMTokenRepository();
    this.lastCheckTime = null;
    // Mapa para rastrear alertas enviadas: clave = "alertId:hora", valor = timestamp
    this.sentAlerts = new Map();
    this.CLEANUP_INTERVAL = 60 * 60 * 1000; // Limpiar mapa cada hora
    // Manejo de errores de conexión
    this.consecutiveErrors = 0;
    this.maxConsecutiveErrors = 5; // Máximo de errores antes de aumentar el intervalo
    this.baseRetryInterval = 2 * 60 * 1000; // 2 minutos base
    this.maxRetryInterval = 15 * 60 * 1000; // 15 minutos máximo
    this.currentRetryInterval = this.baseRetryInterval;
    this.lastErrorLogTime = null;
    this.errorLogThrottle = 5 * 60 * 1000; // Solo loguear errores cada 5 minutos
    
    // Cache de alertas activas para reducir consultas a la BD
    this.cachedAlerts = null;
    this.cacheTimestamp = null;
    this.CACHE_TTL = 10 * 60 * 1000; // Cache válido por 10 minutos
    this.cachedTokens = new Map(); // Cache de tokens FCM por usuario
    this.TOKEN_CACHE_TTL = 30 * 60 * 1000; // Cache de tokens válido por 30 minutos
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
      // Solo loguear si no hay errores recientes o si pasó el throttle
      const shouldLog = this.consecutiveErrors === 0 || 
                       !this.lastErrorLogTime || 
                       (Date.now() - this.lastErrorLogTime) >= this.errorLogThrottle;
      
      if (shouldLog) {
        //console.log('AlertNotificationWorker: Verificando alertas...');
      }
      
      this.lastCheckTime = new Date();

      // Obtener alertas activas (usando cache si está disponible)
      const allAlerts = await this.getCachedActiveAlerts();
      
      // Si llegamos aquí, la conexión fue exitosa, resetear contadores
      if (this.consecutiveErrors > 0) {
        console.log(`AlertNotificationWorker: Conexión restaurada después de ${this.consecutiveErrors} errores.`);
        this.consecutiveErrors = 0;
        this.currentRetryInterval = this.baseRetryInterval;
      }
      
      if (allAlerts.length === 0) {
        //console.log('AlertNotificationWorker: No hay alertas activas.');
        this.scheduleNextCheck();
        return;
      }

      // Obtener estaciones actualizadas del cache
      const estaciones = EstacionDeBicingSyncWorker.getEstacionesCache();
      
      if (!estaciones || estaciones.length === 0) {
        //console.log('AlertNotificationWorker: No hay estaciones en cache.');
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

        // Verificar si alguna hora coincide (con margen de tiempo para asegurar que no se pierdan)
        const matchedHour = alert.horas.find(hora => {
          const [hour, minute] = hora.split(':').map(Number);
          
          // Verificar si estamos en la hora correcta
          if (hour === currentHour) {
            // Verificar si estamos en el minuto programado o en el siguiente minuto
            // Esto permite que las alertas se envíen incluso si hay un pequeño retraso en la ejecución del worker
            // Solo verificamos el siguiente minuto si el minuto programado no es 59 (para evitar problemas con cambio de hora)
            if (minute === currentMinute) {
              return true; // Minuto exacto
            }
            if (minute <= 58 && minute + 1 === currentMinute) {
              return true; // Minuto siguiente (solo para minutos 0-58)
            }
          }
          
          // Si la hora programada es la anterior y el minuto programado es 59, verificar el minuto 0 de la hora actual
          // Esto maneja el caso especial de alertas programadas para las XX:59
          if (hour === currentHour - 1 && minute === 59 && currentMinute === 0) {
            return true;
          }
          
          return false;
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
            
            // Enviar alerta incluso si la estación no está en el cache (usar datos de la BD)
            alertsToSend.push({
              alert,
              estacion: estacion || null,
              alertKey,
            });
            // Marcar como enviada
            this.sentAlerts.set(alertKey, nowTime);
          }
        }
      }

      if (alertsToSend.length === 0) {
        //console.log('AlertNotificationWorker: No hay alertas que ejecutar en este momento.');
        this.scheduleNextCheck();
        return;
      }

      console.log(`AlertNotificationWorker: ${alertsToSend.length} alertas a enviar.`);

      // Obtener tokens FCM de los usuarios (usando cache)
      const userEmails = [...new Set(alertsToSend.map(a => a.alert.user_email))];
      const tokensMap = await this.getCachedTokensForUsers(userEmails);

      // Preparar notificaciones
      const notificationsToSend = [];

      for (const { alert, estacion } of alertsToSend) {
        const tokens = tokensMap[alert.user_email] || [];
        
        if (tokens.length === 0) {
          console.log(`AlertNotificationWorker: Usuario ${alert.user_email} no tiene tokens FCM registrados.`);
          continue;
        }

        // Usar datos de la estación del cache si están disponibles, sino usar datos de la BD
        const espaciosDisponibles = estacion?.anclajesDisponibles || 0;
        const stationNombre = estacion?.nombre || alert.station_nombre || `Estación ${alert.station_id}`;

        for (const token of tokens) {
          notificationsToSend.push({
            fcmToken: token.fcm_token,
            stationData: {
              stationId: alert.station_id,
              stationNombre: stationNombre,
              espaciosDisponibles,
            },
          });
        }
      }

      if (notificationsToSend.length === 0) {
        //console.log('AlertNotificationWorker: No hay notificaciones para enviar.');
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
      
      // Detectar si es un error de conexión/timeout
      const isConnectionError = error.message?.includes('timeout') || 
                                error.message?.includes('connect') ||
                                error.code === 'ETIMEDOUT' ||
                                error.code === 'ECONNREFUSED';
      
      // Solo loguear errores si pasó el throttle o es el primer error
      const shouldLogError = this.consecutiveErrors === 1 || 
                            !this.lastErrorLogTime || 
                            (Date.now() - this.lastErrorLogTime) >= this.errorLogThrottle;
      
      if (shouldLogError) {
        if (isConnectionError) {
          console.error(`AlertNotificationWorker: Error de conexión a la base de datos (${this.consecutiveErrors} errores consecutivos):`, error.message);
        } else {
          console.error(`AlertNotificationWorker: Error verificando alertas (${this.consecutiveErrors} errores consecutivos):`, error);
        }
        this.lastErrorLogTime = Date.now();
      }
      
      // Si hay muchos errores consecutivos, aumentar el intervalo de retry con backoff exponencial
      // También invalidar el cache para forzar una consulta fresca en el siguiente intento
      if (this.consecutiveErrors >= this.maxConsecutiveErrors && isConnectionError) {
        // Invalidar cache para que el siguiente intento use datos frescos
        this.invalidateAlertsCache();
        
        this.currentRetryInterval = Math.min(
          this.currentRetryInterval * 2,
          this.maxRetryInterval
        );
        if (shouldLogError) {
          console.warn(`AlertNotificationWorker: Aumentando intervalo de retry a ${this.currentRetryInterval / 1000 / 60} minutos debido a errores de conexión. Cache invalidado.`);
        }
      }
      
      // Si hay demasiados errores consecutivos (más de 50), resetear el contador periódicamente
      // para evitar que se acumule indefinidamente
      if (this.consecutiveErrors > 50) {
        console.warn(`AlertNotificationWorker: Demasiados errores consecutivos (${this.consecutiveErrors}), reseteando contador para evitar acumulación excesiva.`);
        this.consecutiveErrors = 0;
        this.currentRetryInterval = this.baseRetryInterval;
        this.invalidateAlertsCache();
      }
    } finally {
      this.scheduleNextCheck();
    }
  }

  /**
   * Obtiene todas las alertas activas usando cache para reducir consultas a la BD
   */
  async getCachedActiveAlerts() {
    const now = Date.now();
    
    // Si el cache es válido, devolverlo
    if (this.cachedAlerts && this.cacheTimestamp && 
        (now - this.cacheTimestamp) < this.CACHE_TTL) {
      return this.cachedAlerts;
    }
    
    // Cache expirado o no existe, consultar BD
    const alerts = await this.getAllActiveAlerts();
    
    // Actualizar cache
    this.cachedAlerts = alerts;
    this.cacheTimestamp = now;
    
    return alerts;
  }

  /**
   * Invalida el cache de alertas (llamar cuando se crean/modifican/eliminan alertas)
   */
  invalidateAlertsCache() {
    this.cachedAlerts = null;
    this.cacheTimestamp = null;
  }

  /**
   * Ejecuta una query con cancelación real vía AbortController.
   * Evita el problema de Promise.race que no cancela la query en el servidor.
   */
  async queryWithTimeout(queryText, params = [], timeoutMs = 10000) {
    const client = await pool.connect();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const result = await client.query({
        text: queryText,
        values: params,
        // node-postgres soporta AbortSignal (pg >= 8.11), esto envía CANCEL al backend
        signal: controller.signal
      });
      return result;
    } finally {
      clearTimeout(timeoutId);
      client.release();
    }
  }

  /**
   * Obtiene todas las alertas activas (filtradas por día) para reducir volumen.
   * Optimizado con cancelación real y sin JOIN para evitar timeouts y conexiones atascadas.
   */
  async getAllActiveAlerts() {
    // Calcular día de la semana (0 = Lunes ... 6 = Domingo) como en la BD
    const jsDay = new Date().getDay(); // 0=Domingo..6=Sábado
    const dayIndex = jsDay === 0 ? 6 : jsDay - 1;

    // Consulta sin JOIN y filtrada por día para reducir el set de resultados.
    // El nombre/dirección de estación se obtienen del cache en memoria.
    const sql = `
      SELECT 
        id,
        user_email,
        station_id,
        horas,
        dias_semana,
        activa
      FROM station_alerts
      WHERE activa = true
        AND $1 = ANY(dias_semana)
    `;

    const result = await this.queryWithTimeout(sql, [dayIndex], 12000); // 12s
    // Añadimos placeholders de nombre/dirección para mantener compatibilidad con el resto del flujo
    return result.rows.map(r => ({
      ...r,
      station_nombre: r.station_nombre ?? null,
      station_direccion: r.station_direccion ?? null
    }));
  }

  /**
   * Versión alternativa (mantener por compatibilidad si hiciera falta).
   * También cancelable y filtrada por día.
   */
  async getAllActiveAlertsSimple() {
    const jsDay = new Date().getDay();
    const dayIndex = jsDay === 0 ? 6 : jsDay - 1;
    const sql = `
      SELECT 
        id,
        user_email,
        station_id,
        horas,
        dias_semana,
        activa
      FROM station_alerts
      WHERE activa = true
        AND $1 = ANY(dias_semana)
    `;
    const result = await this.queryWithTimeout(sql, [dayIndex], 8000); // 8s
    return result.rows;
  }

  /**
   * Obtiene tokens FCM agrupados por usuario usando cache
   */
  async getCachedTokensForUsers(userEmails) {
    const now = Date.now();
    const tokensMap = {};
    const emailsToFetch = [];

    // Verificar cache para cada usuario
    for (const email of userEmails) {
      const cached = this.cachedTokens.get(email);
      if (cached && (now - cached.timestamp) < this.TOKEN_CACHE_TTL) {
        tokensMap[email] = cached.tokens;
      } else {
        emailsToFetch.push(email);
      }
    }

    // Si hay usuarios sin cache, consultar BD
    if (emailsToFetch.length > 0) {
      const tokens = await this.fcmTokenRepo.getTokensByUsers(emailsToFetch);
      
      // Agrupar tokens por usuario
      for (const token of tokens) {
        if (!tokensMap[token.user_email]) {
          tokensMap[token.user_email] = [];
        }
        tokensMap[token.user_email].push(token);
      }

      // Actualizar cache para los usuarios consultados
      for (const email of emailsToFetch) {
        this.cachedTokens.set(email, {
          tokens: tokensMap[email] || [],
          timestamp: now
        });
      }
    }

    return tokensMap;
  }

  /**
   * Invalida el cache de tokens para un usuario específico
   */
  invalidateTokenCache(userEmail) {
    this.cachedTokens.delete(userEmail);
  }

  /**
   * Obtiene tokens FCM agrupados por usuario (método directo sin cache)
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
  scheduleNextCheck() {
    if (!this.isRunning) return;
    
    // Usar el intervalo de retry actual si hay errores, sino usar el intervalo normal
    const nextInterval = this.consecutiveErrors > 0 ? this.currentRetryInterval : this.checkInterval;
    
    this.intervalId = setTimeout(() => this.checkAlerts(), nextInterval);
    
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

