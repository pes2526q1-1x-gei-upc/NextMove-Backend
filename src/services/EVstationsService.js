import StationsRepository from '../repositories/EVStationsRepository.js';
import { calculateDistance } from '../utils/maths.js';

// Cache de SOLO datos dinámicos (estados de conectores)
let dynamicCache = new Map();
let lastFetch = null;

const CACHE_DURATION = 5 * 60 * 1000;

export default class StationsService {
  constructor() {
    this.repository = new StationsRepository();
  }

  async fetchAllStations() {
    try {
      const dbStations = await this.repository.getAllStations();
      
      if (dbStations.length > 0) {
        console.log(`Loaded ${dbStations.length} stations from database`);
        return dbStations;
      }

      console.log('No stations in database');
      return [];
    } catch (error) {
      console.error('Error fetching stations from database:', error);
      return [];
    }
  }

  async getStationById(id) {
    try {
      const dbStation = await this.repository.getStationById(id);
      return dbStation;
    } catch (error) {
      console.error('Error getting station by id:', error);
      return null;
    }
  }

  async searchStationsByLocation(lat, lon, radiusKm = 5) {
    try {
      const nearbyStations = await this.repository.getNearbyStations(lat, lon, radiusKm);
      return nearbyStations;
    } catch (error) {
      console.error('Error searching stations by location:', error);
      return [];
    }
  }

  async getStationsInBounds(bounds) {
    try {
      const stations = await this.repository.getStationsInBounds(
        bounds.north,
        bounds.south,
        bounds.east,
        bounds.west
      );
      return stations;
    } catch (error) {
      console.error('Error getting stations in bounds:', error);
      return [];
    }
  }

  async getStationsByCity(city) {
    try {
      const stations = await this.repository.getStationsByCity(city);
      return stations;
    } catch (error) {
      console.error('Error getting stations by city:', error);
      return [];
    }
  }

  /**
   * Obtiene los datos dinámicos de una estación desde el cache
   */
  getDynamicData(stationId) {
    return dynamicCache.get(stationId);
  }

  getCachedStations() {
    return {
      stations: dynamicCache,
      lastFetch: lastFetch ? new Date(lastFetch) : null,
      count: dynamicCache.size,
      isFresh: lastFetch && Date.now() - lastFetch < CACHE_DURATION
    };
  }

  clearCache() {
    dynamicCache.clear();
    lastFetch = null;
    console.log('Dynamic cache cleared');
  }

  /**
   * Refresca el cache con datos dinámicos extraídos de ICAEN
   */
  async forceRefresh(dynamicDataMap) {
    this.clearCache();
    dynamicCache = dynamicDataMap;
    lastFetch = Date.now();
    console.log(`Dynamic cache refreshed with ${dynamicCache.size} stations`);
  }
}