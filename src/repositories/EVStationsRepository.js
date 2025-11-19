import pool from '../config/database.js';

export default class StationsRepository {
  
  async upsertStation(stationData) {
    const {
      id,
      name,
      address,
      city,
      longitude,
      latitude,
      ccs_power_kw,
      chademo_power_kw,
      mennekes_power_kw,
      schuko_power_kw
    } = stationData;

    const query = `
      INSERT INTO ev_stations (
        id, name, address, city, coordinates,
        ccs_power_kw, chademo_power_kw, mennekes_power_kw, schuko_power_kw,
        last_synced_at
      ) VALUES (
        $1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326),
        $7, $8, $9, $10, NOW()
      )
      ON CONFLICT (id) 
      DO UPDATE SET
        name = EXCLUDED.name,
        address = EXCLUDED.address,
        city = EXCLUDED.city,
        coordinates = EXCLUDED.coordinates,
        ccs_power_kw = EXCLUDED.ccs_power_kw,
        chademo_power_kw = EXCLUDED.chademo_power_kw,
        mennekes_power_kw = EXCLUDED.mennekes_power_kw,
        schuko_power_kw = EXCLUDED.schuko_power_kw,
        last_synced_at = NOW()
      RETURNING *;
    `;

    const values = [
      id, name, address, city, longitude, latitude,
      ccs_power_kw, chademo_power_kw, mennekes_power_kw, schuko_power_kw
    ];

    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error upserting station:', error);
      throw error;
    }
  }

  async upsertStationsBatch(stationsData) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const results = [];
      for (const stationData of stationsData) {
        const result = await this.upsertStation(stationData);
        results.push(result);
      }
      
      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error in batch upsert:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getAllStations() {
    const query = `
      SELECT 
        id,
        name,
        address,
        city,
        ST_X(coordinates::geometry) as longitude,
        ST_Y(coordinates::geometry) as latitude,
        ccs_power_kw,
        chademo_power_kw,
        mennekes_power_kw,
        schuko_power_kw,
        created_at,
        updated_at,
        last_synced_at
      FROM ev_stations
      ORDER BY name;
    `;

    try {
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error fetching all stations:', error);
      throw error;
    }
  }

  async getStationById(id) {
    const query = `
      SELECT 
        id,
        name,
        address,
        city,
        ST_X(coordinates::geometry) as longitude,
        ST_Y(coordinates::geometry) as latitude,
        ccs_power_kw,
        chademo_power_kw,
        mennekes_power_kw,
        schuko_power_kw,
        created_at,
        updated_at,
        last_synced_at
      FROM ev_stations
      WHERE id = $1;
    `;

    try {
      const result = await pool.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching station by id:', error);
      throw error;
    }
  }

  async getNearbyStations(latitude, longitude, radiusKm = 5) {
    const query = `
      SELECT 
        id,
        name,
        address,
        city,
        ST_X(coordinates::geometry) as longitude,
        ST_Y(coordinates::geometry) as latitude,
        ccs_power_kw,
        chademo_power_kw,
        mennekes_power_kw,
        schuko_power_kw,
        ST_Distance(
          coordinates,
          ST_SetSRID(ST_MakePoint($2, $1), 4326)
        ) / 1000 as distance
      FROM ev_stations
      WHERE ST_DWithin(
        coordinates,
        ST_SetSRID(ST_MakePoint($2, $1), 4326),
        $3 * 1000
      )
      ORDER BY distance;
    `;

    try {
      const result = await pool.query(query, [latitude, longitude, radiusKm]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching nearby stations:', error);
      throw error;
    }
  }

  async getStationsInBounds(north, south, east, west) {
    const query = `
      SELECT 
        id,
        name,
        address,
        city,
        ST_X(coordinates::geometry) as longitude,
        ST_Y(coordinates::geometry) as latitude,
        ccs_power_kw,
        chademo_power_kw,
        mennekes_power_kw,
        schuko_power_kw
      FROM ev_stations
      WHERE ST_Within(
        coordinates::geometry,
        ST_MakeEnvelope($4, $2, $3, $1, 4326)
      );
    `;

    try {
      const result = await pool.query(query, [north, south, east, west]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching stations in bounds:', error);
      throw error;
    }
  }

  async getStationsByCity(city) {
    const query = `
      SELECT 
        id,
        name,
        address,
        city,
        ST_X(coordinates::geometry) as longitude,
        ST_Y(coordinates::geometry) as latitude,
        ccs_power_kw,
        chademo_power_kw,
        mennekes_power_kw,
        schuko_power_kw
      FROM ev_stations
      WHERE city ILIKE $1
      ORDER BY name;
    `;

    try {
      const result = await pool.query(query, [`%${city}%`]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching stations by city:', error);
      throw error;
    }
  }

  async deleteAllStations() {
    const query = 'DELETE FROM ev_stations;';
    
    try {
      const result = await pool.query(query);
      return result.rowCount;
    } catch (error) {
      console.error('Error deleting all stations:', error);
      throw error;
    }
  }

  async getStationsCount() {
    const query = 'SELECT COUNT(*) as count FROM ev_stations;';
    
    try {
      const result = await pool.query(query);
      return parseInt(result.rows[0].count);
    } catch (error) {
      console.error('Error getting stations count:', error);
      throw error;
    }
  }
}