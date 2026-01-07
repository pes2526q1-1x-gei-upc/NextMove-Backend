import BanService from '../services/BanService.js';

class BanExpirationWorker {
  constructor() {
    this.isRunning = false;
    this.checkInterval = 5 * 60 * 1000; // Verificar cada 5 minutos
    this.intervalId = null;
  }

  /**
   * Inicia el worker
   */
  start() {
    if (this.isRunning) {
      console.log('BanExpirationWorker: Ya está en ejecución.');
      return;
    }
    this.isRunning = true;
    console.log('BanExpirationWorker: Worker iniciado.');
    this.checkExpiredBans();
  }

  /**
   * Detiene el worker
   */
  stop() {
    if (!this.isRunning) return;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('BanExpirationWorker: Worker detenido.');
  }

  /**
   * Verifica baneos expirados
   */
  async checkExpiredBans() {
    if (!this.isRunning) return;

    try {
      //console.log('BanExpirationWorker: Verificando baneos expirados...');
      const result = await BanService.processExpiredBans();
      
      if (result.processed > 0) {
        console.log(`BanExpirationWorker: Procesados ${result.processed} baneos expirados.`);
      }
    } catch (error) {
      console.error('BanExpirationWorker: Error verificando baneos expirados:', error);
    }

    // Programar próxima verificación
    if (this.isRunning) {
      this.intervalId = setTimeout(() => {
        this.checkExpiredBans();
      }, this.checkInterval);
    }
  }
}

export default new BanExpirationWorker();

