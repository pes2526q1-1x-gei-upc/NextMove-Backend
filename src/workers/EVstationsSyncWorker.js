import StationsService from '../services/EVstationsService.js';
import StationsRepository from '../repositories/EVStationsRepository.js';
import { extractDynamicData, mapICAENToRepository } from '../utils/EVStationsMapper.js';

const ICAEN_WFS_URL = 'https://xarxarecarrega.icaen.gencat.cat/ows/wfs';

class StationsSyncWorker {
  constructor() {
    this.stationsService = new StationsService();
    this.repository = new StationsRepository();
    this.intervalId = null;
    this.isRunning = false;
    this.syncInterval = 5 * 60 * 1000;
    this.dbSyncInterval = 24 * 60 * 60 * 1000;
    this.lastDbSync = null;
    this.stats = {
      totalSyncs: 0,
      lastSyncTime: null,
      lastSyncSuccess: null,
      consecutiveFailures: 0,
      lastDbSyncTime: null,
      lastDbSyncSuccess: null,
    };
  }

  start() {
    if (this.isRunning) {
      console.log('Sync worker is already running');
      return;
    }

    console.log('Starting stations sync worker');
    console.log(`Cache sync interval: ${this.syncInterval / 1000} seconds`);
    console.log(`Database sync interval: ${this.dbSyncInterval / (1000 * 60 * 60)} hours`);

    this.syncStations();

    this.intervalId = setInterval(() => {
      this.syncStations();
    }, this.syncInterval);

    this.isRunning = true;
    console.log('Sync worker started successfully');
  }

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
      
      console.log(`Fetched ${data.features.length} stations at ${new Date().toISOString()}`);
      
      return data.features;
      
    } catch (error) {
      console.error('Error fetching stations from WFS:', error);
      throw error;
    }
  }


  async syncStations() {
    const startTime = Date.now();
    console.log(`\n[${new Date().toISOString()}] Starting station sync`);

    try {
      const icaenFeatures = await this.fetchAllStations();
    
      // Cache usando índice del array como clave
      const dynamicDataMap = new Map();

      icaenFeatures.forEach((feature, index) => {
        const dynamicData = extractDynamicData(feature);
        dynamicDataMap.set(index + "_CAR", dynamicData);
      });
      // console.log(dynamicDataMap);
      console.log(`Cache entries created: ${dynamicDataMap.size}\n`);


      await this.stationsService.forceRefresh(dynamicDataMap);
      const currentDbCount = await this.repository.getStationsCount();
      const newStationsCount = dynamicDataMap.size;

      let forceRefresh = currentDbCount !== newStationsCount;
    
      if (!forceRefresh) {

        // Hashing nos permite comparar strings más pequeños, aunque en nuestro caso no importa
        // tanto porque aunque concatenemos 2000 ids, Node todavía puede computarlo relativamente rápido
        // Mejor seguir buenas prácticas y además se puede hacer console.log de esta forma.
        const crypto = await import('crypto');
        const newIdsChecksum = crypto
          .createHash('md5')
          .update(icaenFeatures.map(f => f.properties?.id).filter(Boolean).sort().join(','))
          .digest('hex'); 

        const dbIdsChecksum = await this.repository.getExternalIdsChecksum();
      
        forceRefresh = newIdsChecksum != dbIdsChecksum;
        if (forceRefresh) console.log(`EV Stations: database checksum (${dbIdsChecksum}) differ from API checksum (${newIdsChecksum}), forcing refresh...`);
      }
      else console.log(`Current database EV stations count (${currentDbCount}) do not match API stations count (${newStationsCount}), forcing refresh...`);

      const shouldSyncDb = (!this.lastDbSync || 
                         (Date.now() - this.lastDbSync >= this.dbSyncInterval) ||
                          forceRefresh
      )
                         && process.env.NODE_ENV === 'prod';

      // const shouldSyncDb = forceRefresh && process.env.NODE_ENV === 'prod';
      // if (!forceRefresh) console.log("NOT FORCED TO REFRESH!!!");

      if (shouldSyncDb) {
        console.log('\nStarting database synchronization for ev stations...');
        await this.syncToDatabase(icaenFeatures);
        this.lastDbSync = Date.now();
        this.stats.lastDbSyncTime = new Date();
        this.stats.lastDbSyncSuccess = true;
        console.log('Database sync completed');
      } else {
        const nextDbSync = this.lastDbSync 
          ? new Date(this.lastDbSync + this.dbSyncInterval)
          : new Date(Date.now() + this.dbSyncInterval);
        console.log(`Next database sync scheduled at: ${nextDbSync.toISOString()}`);
      }

      const duration = Date.now() - startTime;
      this.stats.totalSyncs++;
      this.stats.lastSyncTime = new Date();
      this.stats.lastSyncSuccess = true;
      this.stats.consecutiveFailures = 0;

      console.log(`\nSync completed successfully`);
      console.log(`  Stations fetched: ${icaenFeatures.length}`);
      console.log(`  Cache size: ${dynamicDataMap.size}`);
      console.log(`  Duration: ${duration}ms\n`);

      return {
        success: true,
        count: icaenFeatures.length,
        duration,
        dbSynced: shouldSyncDb
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      this.stats.lastSyncTime = new Date();
      this.stats.lastSyncSuccess = false;
      this.stats.consecutiveFailures++;

      console.error(`Sync failed after ${duration}ms`);
      console.error(`  Error: ${error.message}`);
      console.error(`  Consecutive failures: ${this.stats.consecutiveFailures}`);

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

  async syncToDatabase(icaenStations) {
    const startTime = Date.now();
    console.log(`Syncing ${icaenStations.length} stations to database...`);

    try {
      const currentDbIds = new Set(await this.repository.getAllStationIds());
      console.log(`Current DB stations: ${currentDbIds.size}`);

      const newApiIds = new Set(
        icaenStations.map((_, index) => `${index}_CAR`)
      );
      console.log(`API stations: ${newApiIds.size}`);

      const idsToDelete = [...currentDbIds].filter(id => !newApiIds.has(id));
      const idsToInsert = [...newApiIds].filter(id => !currentDbIds.has(id));

      console.log(`\nChanges detected:`);
      console.log(`  To delete: ${idsToDelete.length}`);
      console.log(`  To insert: ${idsToInsert.length}`);
      console.log(`  Unchanged: ${currentDbIds.size - idsToDelete.length}`);

      let deletedCount = 0;
      let insertedCount = 0;

      if (idsToDelete.length > 0) {
        console.log(`\nDeleting ${idsToDelete.length} removed stations...`);
        deletedCount = await this.repository.deleteStationsByIds(idsToDelete);
        console.log(`Deleted: ${deletedCount}`);
      }

      if (idsToInsert.length > 0) {
        console.log(`\nInserting ${idsToInsert.length} new stations...`);
      
        const stationsToInsert = icaenStations
          .map((feature, index) => ({
            ...mapICAENToRepository(feature),
            arrayIndex: index
          }))
          .filter(station => idsToInsert.includes(`${station.arrayIndex}_CAR`));

        insertedCount = await this.repository.batchInsertStations(stationsToInsert);
        console.log(`Inserted: ${insertedCount}`);
      }

      const duration = Date.now() - startTime;
  
      console.log(`\nDatabase sync completed:`);
      console.log(`  Stations deleted: ${deletedCount}`);
      console.log(`  Stations inserted: ${insertedCount}`);
      console.log(`  Total in DB: ${currentDbIds.size - deletedCount + insertedCount}`);
      console.log(`  Duration: ${duration}ms`);

      return {
        success: true,
        deletedCount,
        insertedCount,
        unchangedCount: currentDbIds.size - deletedCount,
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`Database sync failed after ${duration}ms:`, error);
      this.stats.lastDbSyncSuccess = false;
  
      throw error;
    }
  }

  getStats() {
    return {
      ...this.stats,
      isRunning: this.isRunning,
      syncIntervalSeconds: this.syncInterval / 1000,
      dbSyncIntervalHours: this.dbSyncInterval / (1000 * 60 * 60),
      nextSyncIn: this.isRunning && this.stats.lastSyncTime
        ? Math.max(0, this.syncInterval - (Date.now() - this.stats.lastSyncTime.getTime()))
        : null,
      nextDbSyncIn: this.lastDbSync
        ? Math.max(0, this.dbSyncInterval - (Date.now() - this.lastDbSync))
        : null,
    };
  }

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

  setDbSyncInterval(milliseconds) {
    this.dbSyncInterval = milliseconds;
    console.log(`Database sync interval updated to ${milliseconds / (1000 * 60 * 60)} hours`);
  }
}

const syncWorker = new StationsSyncWorker();

export default syncWorker;