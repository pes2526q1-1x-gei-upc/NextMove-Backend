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
      const lastFetch = Date.now();
      
      console.log(`Fetched ${data.features.length} stations at ${new Date(lastFetch).toISOString()}`);
      
      return data.features;
      
    } catch (error) {
      console.error('Error fetching stations from WFS:', error);
      throw error;
    }
  }

  // async syncStations() {
  //   const startTime = Date.now();
  //   console.log(`\n[${new Date().toISOString()}] Starting station sync`);

  //   try {
  //     const icaenFeatures = await this.fetchAllStations();
      
  //     // Guardar TODOS los features completos en el cache
  //     const dynamicDataMap = new Map();
  //     for (const feature of icaenFeatures) {
  //       const stationId = feature.properties?.id;
  //       if (stationId) {
  //         const dynamicData = extractDynamicData(feature);
  //         dynamicDataMap.set(stationId, dynamicData);
  //       }
  //     }
  //     console.log(`Map size before forceRefresh: ${dynamicDataMap.size}`);
  //     await this.stationsService.forceRefresh(dynamicDataMap);

  //         const cacheInfo = this.stationsService.getCachedStations();
  //   console.log(`Cache size after forceRefresh: ${cacheInfo.count}`);
    
  //     const shouldSyncDb = (!this.lastDbSync || 
  //                          (Date.now() - this.lastDbSync >= this.dbSyncInterval))
  //                          && process.env.NODE_ENV !== 'dev';

  //     if (shouldSyncDb) {
  //       console.log('\nStarting database synchronization...');
  //       await this.syncToDatabase(icaenFeatures);
  //       this.lastDbSync = Date.now();
  //       this.stats.lastDbSyncTime = new Date();
  //       this.stats.lastDbSyncSuccess = true;
  //       console.log('Database sync completed');
  //     } else {
  //       const nextDbSync = this.lastDbSync 
  //         ? new Date(this.lastDbSync + this.dbSyncInterval)
  //         : new Date(Date.now() + this.dbSyncInterval);
  //       console.log(`Next database sync scheduled at: ${nextDbSync.toISOString()}`);
  //     }

  //     const duration = Date.now() - startTime;
  //     this.stats.totalSyncs++;
  //     this.stats.lastSyncTime = new Date();
  //     this.stats.lastSyncSuccess = true;
  //     this.stats.consecutiveFailures = 0;

  //     console.log(`\nSync completed successfully`);
  //     console.log(`  Stations fetched: ${icaenFeatures.length}`);
  //     console.log(`  Dynamic cache size: ${dynamicDataMap.size}`);
  //     console.log(`  Duration: ${duration}ms`);
  //     console.log(`  Total syncs: ${this.stats.totalSyncs}\n`);

  //     return {
  //       success: true,
  //       count: icaenFeatures.length,
  //       duration,
  //       dbSynced: shouldSyncDb
  //     };

  //   } catch (error) {
  //     const duration = Date.now() - startTime;
  //     this.stats.lastSyncTime = new Date();
  //     this.stats.lastSyncSuccess = false;
  //     this.stats.consecutiveFailures++;

  //     console.error(`Sync failed after ${duration}ms`);
  //     console.error(`  Error: ${error.message}`);
  //     console.error(`  Consecutive failures: ${this.stats.consecutiveFailures}`);

  //     if (this.stats.consecutiveFailures >= 3) {
  //       console.error(`WARNING: ${this.stats.consecutiveFailures} consecutive sync failures detected`);
  //     }

  //     return {
  //       success: false,
  //       error: error.message,
  //       duration,
  //     };
  //   }
  // }

  async syncStations() {
  const startTime = Date.now();
  console.log(`\n[${new Date().toISOString()}] Starting station sync`);

  try {
    const icaenFeatures = await this.fetchAllStations();
    
    const dynamicDataMap = new Map();
    const duplicates = [];
    const firstOccurrence = new Map();

    for (const feature of icaenFeatures) {
      const stationId = feature.properties?.id;
      
      if (firstOccurrence.has(stationId)) {
        // Es un duplicado - guardar ambos para análisis
        duplicates.push({
          id: stationId,
          first: firstOccurrence.get(stationId),
          duplicate: {
            name: feature.properties?.nom,
            address: feature.properties?.carrer,
            city: feature.properties?.ciutat,
            coordinates: feature.geometry?.coordinates,
            estatccs: feature.properties?.estatccs,
            estatcha: feature.properties?.estatcha,
            estatmnk1: feature.properties?.estatmnk1,
            estatmnk2: feature.properties?.estatmnk2,
            shucko: feature.properties?.shucko,
            potenciaccs: feature.properties?.potenciaccs,
            potenciacha: feature.properties?.potenciacha,
            potenciamnk1: feature.properties?.potenciamnk1,
            potenciamnk2: feature.properties?.potenciamnk2,
            superrapid: feature.properties?.superrapid,
            tipus_acces: feature.properties?.tipus_acces
          }
        });
      } else {
        // Primera vez que vemos este ID
        firstOccurrence.set(stationId, {
          name: feature.properties?.nom,
          address: feature.properties?.carrer,
          city: feature.properties?.ciutat,
          coordinates: feature.geometry?.coordinates,
          estatccs: feature.properties?.estatccs,
          estatcha: feature.properties?.estatcha,
          estatmnk1: feature.properties?.estatmnk1,
          estatmnk2: feature.properties?.estatmnk2,
          shucko: feature.properties?.shucko,
          potenciaccs: feature.properties?.potenciaccs,
          potenciacha: feature.properties?.potenciacha,
          potenciamnk1: feature.properties?.potenciamnk1,
          potenciamnk2: feature.properties?.potenciamnk2,
          superrapid: feature.properties?.superrapid,
          tipus_acces: feature.properties?.tipus_acces
        });
      }
      
      const dynamicData = extractDynamicData(feature);
      dynamicDataMap.set(stationId, dynamicData);
    }

    // Guardar duplicados en archivo
    if (duplicates.length > 0) {
      const fs = await import('fs');
      fs.writeFileSync(
        './duplicates-analysis.json', 
        JSON.stringify(duplicates, null, 2)
      );
      console.log(`📝 Saved ${duplicates.length} duplicates to duplicates-analysis.json`);
    }

    console.log(`\n=== SYNC SUMMARY ===`);
    console.log(`Total features: ${icaenFeatures.length}`);
    console.log(`Unique stations: ${dynamicDataMap.size}`);
    console.log(`Duplicates: ${duplicates.length}`);
    console.log(`===================\n`);
    
    await this.stationsService.forceRefresh(dynamicDataMap);

    const cacheInfo = this.stationsService.getCachedStations();
    console.log(`Cache size after forceRefresh: ${cacheInfo.count}`);
    
    const shouldSyncDb = (!this.lastDbSync || 
                         (Date.now() - this.lastDbSync >= this.dbSyncInterval))
                         && process.env.NODE_ENV !== 'dev';

    if (shouldSyncDb) {
      console.log('\nStarting database synchronization...');
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
    console.log(`  Unique stations: ${seenIds.size}`);
    console.log(`  Duplicates: ${duplicateCount}`);
    console.log(`  Dynamic cache size: ${dynamicDataMap.size}`);
    console.log(`  Duration: ${duration}ms`);
    console.log(`  Total syncs: ${this.stats.totalSyncs}\n`);

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
      const mappedStations = icaenStations.map(mapICAENToRepository);

      let successCount = 0;
      let errorCount = 0;

      // TODO: cambiar Upsert por batch es más eficiente que iterar
      // Lo dejo así de momento porque es más fácil de debugar.
      for (const station of mappedStations) {
        try {
          await this.repository.upsertStation(station);
          successCount++;
          
          if (successCount % 100 === 0) {
            console.log(`  Progress: ${successCount}/${mappedStations.length} stations synced`);
          }
        } catch (error) {
          errorCount++;
          console.error(`  Error syncing station ${station.id}:`, error.message);
        }
      }

      const duration = Date.now() - startTime;
      
      console.log(`\nDatabase sync completed:`);
      console.log(`  Success: ${successCount}`);
      console.log(`  Errors: ${errorCount}`);
      console.log(`  Duration: ${duration}ms`);

      return {
        success: true,
        successCount,
        errorCount,
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