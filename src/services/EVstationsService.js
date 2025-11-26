import StationsRepository from '../repositories/EVStationsRepository.js';
import { mapRepositoryToGraphQL } from '../utils/EVStationsMapper.js';

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
        const dynamicData = dynamicCache.get(dbStation.id);
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
        const dynamicData = dynamicCache.get(dbStation.id);
        return mapRepositoryToGraphQL(dbStation, dynamicData);
      });
    } catch (error) {
      console.error('Error searching stations by location:', error);
      return [];
    }
  }

  async getStationsByAddress(address) {  
    const dbStations = await this.repository.getStationsByAddress(address);
    
    return dbStations.map(dbStation => {
      const dynamicData = dynamicCache.get(dbStation.id);  
      return mapRepositoryToGraphQL(dbStation, dynamicData);
    })
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
        const dynamicData = dynamicCache.get(dbStation.id); 
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
        const dynamicData = dynamicCache.get(dbStation.id);  
        return mapRepositoryToGraphQL(dbStation, dynamicData);
      });
    } catch (error) {
      console.error('Error getting stations by city:', error);
      return [];
    }
  }

  getDynamicData(id) {
    return dynamicCache.get(id);  
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

  async forceRefresh(dynamicDataMap) {
    this.clearCache();
    dynamicCache = dynamicDataMap;
    lastFetch = Date.now();
    console.log(`Dynamic cache refreshed with ${dynamicCache.size} stations`);
  }
}