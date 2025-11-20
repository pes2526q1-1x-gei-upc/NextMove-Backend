import StationsRepository from '../repositories/EVStationsRepository.js';
import { mapRepositoryToGraphQL } from '../utils/EVStationsMapper.js';

// Cache de SOLO datos dinámicos (estados de conectores)
let dynamicCache = new Map();
let lastFetch = null;

const CACHE_DURATION = 5 * 60 * 1000;

export default class StationsService {
  constructor() {
    this.repository = new StationsRepository();
  }

  async getAllStations() {
    try {
      const dbStations = await this.repository.getAllStations();
      
      return dbStations.map(dbStation => {
        const dynamicData = dynamicCache.get(dbStation.id);  // id = índice del array
        return mapRepositoryToGraphQL(dbStation, dynamicData);
      });
    } catch (error) {
      console.error('Error in getAllStations:', error);
      throw error;
    }
  }

  async getStationById(id) {
    try {
      const dbStation = await this.repository.getStationById(id);
      if (!dbStation) return null;
      
      const dynamicData = dynamicCache.get(dbStation.id);
      return mapRepositoryToGraphQL(dbStation, dynamicData);
    } catch (error) {
      console.error('Error in getStationById:', error);
      throw error;
    }
  }

  async searchStationsByLocation(lat, lon, radiusKm = 5) {
    try {
      const dbStations = await this.repository.getNearbyStations(lat, lon, radiusKm);
      
      return dbStations.map(dbStation => {
        const cacheKey = `${dbStation.external_id}||${dbStation.name}||${dbStation.longitude},${dbStation.latitude}`;
        const dynamicData = dynamicCache.get(cacheKey);
        return mapRepositoryToGraphQL(dbStation, dynamicData);
      });
    } catch (error) {
      console.error('Error searching stations by location:', error);
      return [];
    }
  }

  async getStationsInBounds(bounds) {
    try {
      const dbStations = await this.repository.getStationsInBounds(
        bounds.north,
        bounds.south,
        bounds.east,
        bounds.west
      );
      
      return dbStations.map(dbStation => {
        const cacheKey = `${dbStation.external_id}||${dbStation.name}||${dbStation.longitude},${dbStation.latitude}`;
        const dynamicData = dynamicCache.get(cacheKey);
        return mapRepositoryToGraphQL(dbStation, dynamicData);
      });
    } catch (error) {
      console.error('Error getting stations in bounds:', error);
      return [];
    }
  }

  async getStationsByCity(city) {
    try {
      const dbStations = await this.repository.getStationsByCity(city);
      
      return dbStations.map(dbStation => {
        const cacheKey = `${dbStation.external_id}||${dbStation.name}||${dbStation.longitude},${dbStation.latitude}`;
        const dynamicData = dynamicCache.get(cacheKey);
        return mapRepositoryToGraphQL(dbStation, dynamicData);
      });
    } catch (error) {
      console.error('Error getting stations by city:', error);
      return [];
    }
  }

  /**
   * Obtiene los datos dinámicos de una estación desde el cache
   * @param {string} externalId - ID externo de ICAEN
   * @param {string} name - Nombre de la estación
   * @param {number} longitude - Longitud
   * @param {number} latitude - Latitud
   */
  getDynamicData(externalId, name, longitude, latitude) {
    const cacheKey = `${externalId}||${name}||${longitude},${latitude}`;
    return dynamicCache.get(cacheKey);
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