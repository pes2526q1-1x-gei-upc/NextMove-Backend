// src/services/stationsService.js
import fetch from 'node-fetch';

const BASE_URL = process.env.SOCRATA_EV_API_BASE_URL;
const APP_TOKEN = process.env.SOCRATA_APP_TOKEN;

let stationsCache = null;
let lastFetch = null;

// Service class to interact with the Socrata API for EV stations
// Notice that the method specified to inquire data from the API is of type POST, that is because
// Socrata supports complex queries via POST requests with a JSON payload.
// To understand the Socrata API and its query language, refer to:
// https://dev.socrata.com/docs/queries/

export default class StationsService {
  async makeRequest(payload) {
    try {

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-App-Token': APP_TOKEN,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error making request to Socrata API:', error);
      throw error;
    }
  }

  async getStations(limit = 100, pageNumber = 1) {
    const payload = {
      query: 'SELECT *',
      page: {
        // This takes the records of interval [x, y]
        // Such that x = (pageNumber - 1) * limit + 1
        // and y = pageNumber * limit
        pageNumber: pageNumber,
        pageSize: limit,
      },
    };

    const data = await this.makeRequest(payload);
    return data;
  }

  async getStationById(id) {
    const payload = {
      query: `SELECT * WHERE id = '${id}'`,
    };

    const data = await this.makeRequest(payload);
    return data[0] || null;
  }

  async searchStationsByLocation(lat, lon, radius = 500) {
    const payload = {
      query: `SELECT * WHERE within_circle(geocoded_column, ${lat}, ${lon}, ${radius})`,
    };

    return await this.makeRequest(payload);
  }

  async fetchAllStations() {
    console.log('Fetching all stations from API...');
    
    const payload = {
      query: 'SELECT *',
      includeSynthetic: false,
    };

    const data = await this.makeRequest(payload);
    
    stationsCache = data;
    lastFetch = new Date();
    
    console.log(`Fetched ${data.length} stations at ${lastFetch.toISOString()}`);
    
    return data;
  }

  getCachedStations() {
    return {
      stations: stationsCache,
      lastFetch: lastFetch,
      count: stationsCache ? stationsCache.length : 0,
    };
  }

  clearCache() {
    stationsCache = null;
    lastFetch = null;
    console.log('Cache cleared');
  }
}
