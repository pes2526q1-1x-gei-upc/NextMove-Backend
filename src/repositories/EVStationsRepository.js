import pool from '../config/database.js';

export default class StationsRepository {

  async batchInsertStations(stationsData) {
    const client = await pool.connect();
  
    try {
      await client.query('BEGIN');
    
      // Build one INSERT for all the values.
      const values = [];
      const placeholders = [];
    
      stationsData.forEach((station, index) => {
        /**  
     * This "11" offset is needed since each tuple has 11 columns.
      And what we want is a INSERT with values such that:
      
      - Station 0 (index = 0)
      offset = 0 * 11 = 0
      Placeholders: $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11

      - Station 1 (index = 1)
      offset = 1 * 11 = 11
      Placeholders: $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22

      - Station 2 (index = 2)
      offset = 2 * 11 = 22
      Placeholders: $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, and so on...
    */      
   
        const offset = index * 11;
        const stationId = `${station.arrayIndex}_CAR`;

        placeholders.push(
          `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, 
          ST_SetSRID(ST_MakePoint($${offset + 6}, $${offset + 7}), 4326),
          $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, NOW())`
        );
      
        values.push(
          stationId,
          station.id,
          station.name,
          station.address,
          station.city,
          station.longitude,
          station.latitude,
          station.ccs_power_kw,
          station.chademo_power_kw,
          station.mennekes_power_kw,
          station.schuko_power_kw
        );
      });
    
      // console.log('Inserting stations into ev_stations table...', values);
      const stationIds = stationsData.map(s => `${s.arrayIndex}_CAR`);
      const stationsPlaceholders = stationIds.map((_, i) => `($${i + 1})`).join(', ');
      
      await client.query(
        `INSERT INTO stations (id) VALUES ${stationsPlaceholders} ON CONFLICT (id) DO NOTHING`,
        stationIds
      );

      const query = `
      INSERT INTO ev_stations (
        id, external_id, name, address, city, coordinates,
        ccs_power_kw, chademo_power_kw, mennekes_power_kw, schuko_power_kw,
        last_synced_at
      ) VALUES ${placeholders.join(', ')}
    `;
    
      await client.query(query, values);
      await client.query('COMMIT');
    
      return stationsData.length;
    
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error in batch insert:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getExternalIdsChecksum() {
    const query = `
    SELECT MD5(STRING_AGG(external_id, ',' ORDER BY external_id)) as checksum
    FROM ev_stations;
  `;
  
    try {
      const result = await pool.query(query);
      return result.rows[0]?.checksum || null;
    } catch (error) {
      console.error('Error getting external IDs checksum:', error);
      return null;
    }
  }

  async getStationById(id) {
    const query = `
    SELECT 
      id,
      external_id,
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

  async size() {
    const query = `
      SELECT COUNT(*)
      FROM ev_stations;
    `;

    try {
      const result = await pool.query(query);
      return parseInt(result.rows[0].count);
    }
    catch (error) {
      console.log(error);
      return;
    }

  }

  async upsertStation(stationData) {
    const {
      id: externalId,
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

    // Sin UNIQUE constraint, simplemente insertamos todas las estaciones
    const query = `
      INSERT INTO ev_stations (
        external_id, name, address, city, coordinates,
        ccs_power_kw, chademo_power_kw, mennekes_power_kw, schuko_power_kw,
        last_synced_at
      ) VALUES (
        $1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326),
        $7, $8, $9, $10, NOW()
      )
      RETURNING *;
    `;

    const values = [
      externalId, name, address, city, longitude, latitude,
      ccs_power_kw, chademo_power_kw, mennekes_power_kw, schuko_power_kw
    ];

    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error inserting station:', error);
      throw error;
    }
  }

  async getAllStations() {
    const query = `
      SELECT 
        id,
        external_id,
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

  // async getStationById(externalId) {
  //   const query = `
  //     SELECT 
  //       id,
  //       external_id,
  //       name,
  //       address,
  //       city,
  //       ST_X(coordinates::geometry) as longitude,
  //       ST_Y(coordinates::geometry) as latitude,
  //       ccs_power_kw,
  //       chademo_power_kw,
  //       mennekes_power_kw,
  //       schuko_power_kw,
  //       created_at,
  //       updated_at,
  //       last_synced_at
  //     FROM ev_stations
  //     WHERE external_id = $1
  //     LIMIT 1;
  //   `;

  //   try {
  //     const result = await pool.query(query, [externalId]);
  //     return result.rows[0] || null;
  //   } catch (error) {
  //     console.error('Error fetching station by id:', error);
  //     throw error;
  //   }
  // }

  async getNearbyStations(latitude, longitude, radiusKm = 5) {
    const query = `
      SELECT 
        id,
        external_id,
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

  async getStationsByAddress(address) {
    const query = `
      SELECT
        id,
        external_id,
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
      WHERE address ILIKE $1
      ORDER BY name;
    `;
    
    try {
      const result = await pool.query(query, [`%${address}%`]);
      return result.rows;
    }
    catch (error) {
      console.error('Error fetching stations by address:', error);
      throw error;
    }
  }

  async getStationsInBounds(north, south, east, west) {
    const query = `
      SELECT 
        id,
        external_id,
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
        external_id,
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