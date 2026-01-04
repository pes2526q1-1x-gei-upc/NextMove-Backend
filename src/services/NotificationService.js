import admin from 'firebase-admin';

class NotificationService {
  /**
   * Envía una notificación push a un token FCM
   * @param {string} fcmToken - Token FCM del dispositivo
   * @param {object} notification - Datos de la notificación
   * @param {object} data - Datos adicionales para deep linking
   */
  async sendNotification(fcmToken, notification, data = {}) {
    try {
      const message = {
        token: fcmToken,
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: {
          ...data,
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
        },
        android: {
          priority: 'high',
          notification: {
            channelId: 'station_alerts',
            priority: 'high',
            sound: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await admin.messaging().send(message);
      console.log('Notification sent successfully:', response);
      return { success: true, messageId: response };
    } catch (error) {
      console.error('Error sending notification:', error);
      // Si el token es inválido, lo eliminamos
      if (error.code === 'messaging/invalid-registration-token' || 
          error.code === 'messaging/registration-token-not-registered') {
        return { success: false, error: 'invalid_token', errorCode: error.code };
      }
      return { success: false, error: error.message, errorCode: error.code };
    }
  }

  /**
   * Envía notificaciones a múltiples tokens
   * @param {Array<string>} fcmTokens - Array de tokens FCM
   * @param {object} notification - Datos de la notificación
   * @param {object} data - Datos adicionales
   */
  async sendBatchNotifications(fcmTokens, notification, data = {}) {
    if (fcmTokens.length === 0) {
      return { success: true, sent: 0, failed: 0 };
    }

    const messages = fcmTokens.map(token => ({
      token: token,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: {
        ...data,
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'station_alerts',
          priority: 'high',
          sound: 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    }));

    try {
      const response = await admin.messaging().sendEach(messages);
      console.log(`Batch notifications sent: ${response.successCount} success, ${response.failureCount} failed`);
      return {
        success: true,
        sent: response.successCount,
        failed: response.failureCount,
        responses: response.responses,
      };
    } catch (error) {
      console.error('Error sending batch notifications:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Envía notificación de alerta de estación
   * @param {string} fcmToken - Token FCM
   * @param {object} stationData - Datos de la estación
   */
  async sendStationAlert(fcmToken, stationData) {
    const { stationNombre, espaciosDisponibles } = stationData;
    
    const notification = {
      title: 'Alerta de Estación',
      body: `${stationNombre}: ${espaciosDisponibles} espacios disponibles`,
    };

    const data = {
      type: 'station_alert',
      stationId: stationData.stationId,
      stationNombre: stationNombre,
      espaciosDisponibles: espaciosDisponibles.toString(),
    };

    return await this.sendNotification(fcmToken, notification, data);
  }

  /**
   * Envía notificaciones de alerta a múltiples usuarios
   * @param {Array<{fcmToken: string, stationData: object}>} alerts - Array de alertas a enviar
   */
  async sendStationAlertsBatch(alerts) {
    const messages = alerts.map(alert => {
      const { fcmToken, stationData } = alert;
      const { stationNombre, espaciosDisponibles } = stationData;

      return {
        token: fcmToken,
        notification: {
          title: 'Alerta de Estación',
          body: `${stationNombre}: ${espaciosDisponibles} espacios disponibles`,
        },
        data: {
          type: 'station_alert',
          stationId: stationData.stationId,
          stationNombre: stationNombre,
          espaciosDisponibles: espaciosDisponibles.toString(),
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
        },
        android: {
          priority: 'high',
          notification: {
            channelId: 'station_alerts',
            priority: 'high',
            sound: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };
    });

    if (messages.length === 0) {
      return { success: true, sent: 0, failed: 0 };
    }

    try {
      const response = await admin.messaging().sendEach(messages);
      console.log(`Station alerts sent: ${response.successCount} success, ${response.failureCount} failed`);
      return {
        success: true,
        sent: response.successCount,
        failed: response.failureCount,
        responses: response.responses,
      };
    } catch (error) {
      console.error('Error sending station alerts:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new NotificationService();

