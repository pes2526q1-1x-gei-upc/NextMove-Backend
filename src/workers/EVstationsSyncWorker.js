// src/workers/stationsSyncWorker.js
import StationsService from '../services/EVstationsService.js';
const ICAEN_WFS_URL = 'https://xarxarecarrega.icaen.gencat.cat/ows/wfs';
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

  async fetchAllStations() {


    console.log('Fetching all stations from ICAEN WFS...');
    
    const params = new URLSearchParams({
      service: 'WFS',
      version: '1.1.0',
      request: 'GetFeature',
      typename: 'icaen:estat_punt_recarrega_visor',
      outputFormat: 'application/json',
      srsname: 'EPSG:4326'
    });

    try {
      const response = await fetch(`${ICAEN_WFS_URL}?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('xml')) {
        const errorText = await response.text();
        console.error('WFS Error Response:', errorText);
        throw new Error('WFS service returned an error');
      }
      
      const data = await response.json();
      
      const lastFetch = Date.now();
      
      console.log(`Fetched ${data.features.length} stations at ${new Date(lastFetch).toISOString()}`);
      
      return data.features;
      
    } catch (error) {
      console.error('Error fetching stations from WFS:', error);
      throw error;
    }
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
      const stations = await this.fetchAllStations();
      
      const duration = Date.now() - startTime;
      this.stats.totalSyncs++;
      this.stats.lastSyncTime = new Date();
      this.stats.lastSyncSuccess = true;
      this.stats.consecutiveFailures = 0;

      console.log(`\nSync completed successfully\n`);
      console.log(`  Stations fetched: ${stations.length}`);
      console.log(`  Duration: ${duration}ms`);
      console.log(`  Total syncs: ${this.stats.totalSyncs}\n`);

      this.stationsService.forceRefresh(stations);
      // return {
      //   success: true,
      //   count: stations.length,
      //   duration,
      // };

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