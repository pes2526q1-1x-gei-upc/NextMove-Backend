//import fetch from 'node-fetch';
import {calculateDistance}  from '../utils/maths.js';



let stationsCache = null;
let lastFetch = null;

const CACHE_DURATION = 5 * 60 * 1000; 

export default class StationsService {
  
  // TODO: Most of the static data queries should be fetched in DB instead of service!
  async fetchAllStations() {
    if (stationsCache && lastFetch) {
      console.log('Returning cached stations');
      return stationsCache;
    }
    
    // Return null if there is no data in cache. We should return the data in database for offline cases.
    return null;
  }

  async getStationById(id) {
    const stations = stationsCache;
    const station = stations.find(s => s.properties.id === id);
    return station || null;
  }

  async searchStationsByLocation(lat, lon, radiusKm = 5) {
    
    const nearby = stationsCache
      .map(station => {
        const [stationLon, stationLat] = station.geometry.coordinates;
        const distance = calculateDistance(lat, lon, stationLat, stationLon);
        return { ...station, distance };
      })
      .filter(station => station.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);
    
    return nearby;
  }

  async getStationsInBounds(bounds) {
    const stations = stationsCache;
    
    return stations.filter(station => {
      const [lon, lat] = station.geometry.coordinates;
      return lat >= bounds.south && 
             lat <= bounds.north && 
             lon >= bounds.west && 
             lon <= bounds.east;
    });
  }

  async getStationsByCity(city) {
    //const stations =  stationsCache;
    
    return stationsCache.filter(station => {
      const stationCity = station.properties.ciutat || '';
      return stationCity.toLowerCase().includes(city.toLowerCase());
    });
  }



  getCachedStations() {

  
    return {
      stations: stationsCache,
      lastFetch: lastFetch ? new Date(lastFetch) : null,
      count: stationsCache ? stationsCache.length : 0,
      isFresh: lastFetch && Date.now() - lastFetch < CACHE_DURATION
    };
  }

  clearCache() {
    stationsCache = null;
    lastFetch = null;
    console.log('Cache cleared');
  }

  async forceRefresh(data) {
    this.clearCache();
    stationsCache = data;
    lastFetch = Date.now()
    console.log('Cache refreshed correctly!');
  }
}