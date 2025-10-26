import fetch from 'node-fetch';
import {calculateDistance}  from '../utils/maths.js';



let stationsCache = null;
let lastFetch = null;
const CACHE_DURATION = 1 * 30 * 1000; 

export default class StationsService {
  
  // TODO: Most of the static data queries should be fetched in DB instead of service!
  async fetchAllStations() {
    if (stationsCache && lastFetch && 
        Date.now() - lastFetch < CACHE_DURATION) {
      console.log('Returning cached stations');
      return stationsCache;
    }
    
    // Return null if there is no data in cache. We should return the data in database for offline cases.
    return null;
  }

  //   console.log('Fetching all stations from ICAEN WFS...');
    
  //   const params = new URLSearchParams({
  //     service: 'WFS',
  //     version: '1.1.0',
  //     request: 'GetFeature',
  //     typename: 'icaen:estat_punt_recarrega_visor',
  //     outputFormat: 'application/json',
  //     srsname: 'EPSG:4326'
  //   });

  //   try {
  //     const response = await fetch(`${ICAEN_WFS_URL}?${params}`);
      
  //     if (!response.ok) {
  //       throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  //     }
      
  //     const contentType = response.headers.get('content-type');
  //     if (contentType?.includes('xml')) {
  //       const errorText = await response.text();
  //       console.error('WFS Error Response:', errorText);
  //       throw new Error('WFS service returned an error');
  //     }
      
  //     const data = await response.json();
      
  //     stationsCache = data.features || [];
  //     lastFetch = Date.now();
      
  //     console.log(`Fetched ${stationsCache.length} stations at ${new Date(lastFetch).toISOString()}`);
      
  //     return stationsCache;
      
  //   } catch (error) {
  //     console.error('Error fetching stations from WFS:', error);
  //     throw error;
  //   }
  // }

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
    const stations =  stationsCache;
    
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
    console.log('Cache refreshed correctly!');
  }
}