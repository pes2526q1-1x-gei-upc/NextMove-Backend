// src/workers/stationsSyncWorker.js
import StationsService from '../services/stationsService.js';

/**
 * Background worker that periodically fetches station data from the external API.
 * Maintains an in-memory cache of stations with automatic refresh every 5 minutes.
 * 
 * This worker ensures that:
 * - Station data is always fresh (max 5 minutes old)
 * - GraphQL queries don't directly hit the external API
 * - Failed syncs are tracked and logged
 * - The application can continue serving stale data if the API is down
 */
class StationsSyncWorker {
  constructor() {
    this.stationsService = new StationsService();
    this.intervalId = null;
    this.isRunning = false;
    this.syncInterval = 1 * 60 * 1000; // 5 minutes in milliseconds
    this.stats = {
      totalSyncs: 0,
      lastSyncTime: null,
      lastSyncSuccess: null,
      consecutiveFailures: 0,
    };
  }

  /**
   * Starts the background sync process.
   * Performs an initial sync immediately, then schedules periodic syncs.
   */
  start() {
    if (this.isRunning) {
      console.log('Sync worker is already running');
      return;
    }

    console.log('Starting stations sync worker');
    console.log(`Sync interval: ${this.syncInterval / 1000} seconds`);

    // Perform initial sync
    this.syncStations();

    // Schedule periodic syncs
    this.intervalId = setInterval(() => {
      this.syncStations();
    }, this.syncInterval);

    this.isRunning = true;
    console.log('Sync worker started successfully');
  }

  /**
   * Stops the background sync process.
   */
  stop() {
    if (!this.isRunning) {
      console.log('Sync worker is not running');
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    console.log('Sync worker stopped');
  }

  /**
   * Performs a single synchronization with the external API.
   * Updates statistics and logs the result.
   * 
   * @returns {Promise<Object>} Sync result with success status, count, and duration
   */
  async syncStations() {
    const startTime = Date.now();
    console.log(`\n[${new Date().toISOString()}] Starting station sync`);

    try {
      const stations = await this.stationsService.forceRefresh();
      
      const duration = Date.now() - startTime;
      this.stats.totalSyncs++;
      this.stats.lastSyncTime = new Date();
      this.stats.lastSyncSuccess = true;
      this.stats.consecutiveFailures = 0;

      console.log(`\nSync completed successfully\n`);
      console.log(`  Stations fetched: ${stations.length}`);
      console.log(`  Duration: ${duration}ms`);
      console.log(`  Total syncs: ${this.stats.totalSyncs}\n`);

      return {
        success: true,
        count: stations.length,
        duration,
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      this.stats.lastSyncTime = new Date();
      this.stats.lastSyncSuccess = false;
      this.stats.consecutiveFailures++;

      console.error(`Sync failed after ${duration}ms`);
      console.error(`  Error: ${error.message}`);
      console.error(`  Consecutive failures: ${this.stats.consecutiveFailures}`);

      // Alert if multiple consecutive failures
      if (this.stats.consecutiveFailures >= 3) {
        console.error(`WARNING: ${this.stats.consecutiveFailures} consecutive sync failures detected`);
      }

      return {
        success: false,
        error: error.message,
        duration,
      };
    }
  }

  /**
   * Returns current worker statistics including sync history and timing.
   * 
   * @returns {Object} Worker stats with sync count, last sync time, and next sync estimate
   */
  getStats() {
    return {
      ...this.stats,
      isRunning: this.isRunning,
      syncIntervalSeconds: this.syncInterval / 1000,
      nextSyncIn: this.isRunning && this.stats.lastSyncTime
        ? Math.max(0, this.syncInterval - (Date.now() - this.stats.lastSyncTime.getTime()))
        : null,
    };
  }

  /**
   * Updates the sync interval. Requires worker restart to take effect.
   * 
   * @param {number} milliseconds - New sync interval in milliseconds
   */
  setSyncInterval(milliseconds) {
    const wasRunning = this.isRunning;
    
    if (wasRunning) {
      this.stop();
    }

    this.syncInterval = milliseconds;
    console.log(`Sync interval updated to ${milliseconds / 1000} seconds`);

    if (wasRunning) {
      this.start();
    }
  }
}

// Export singleton instance
const syncWorker = new StationsSyncWorker();

export default syncWorker;