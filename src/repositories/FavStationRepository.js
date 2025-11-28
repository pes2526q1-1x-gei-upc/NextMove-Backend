import pool from '../config/database.js';

class FavStationRepository {
  async getFavStations(email,type) {
    if (type === 'BIKE'){
      const result = await pool.query(`
          SELECT fs.station_id, s.nombre, s.direccion, s.plazastotales, s.coordenadas[1] as latitude, s.coordenadas[0] as longitude, s.estacioncargaelectrica 
          FROM favstation fs JOIN estacionbicing s ON fs.station_id = s.id 
          WHERE fs.email = $1 and fs.station_type = 'BIKE'
      `, [email]);
      console.log(result.rows);
      return result.rows;
    }
    if (type === 'CAR'){
      const result = await pool.query(`
          SELECT fs.station_id, s.name, s.address, s.city, ST_X(s.coordinates::geometry) as longitude,
  ST_Y(s.coordinates::geometry) as latitude, s.ccs_power_kw, s.chademo_power_kw, s.mennekes_power_kw, s.schuko_power_kw 
          FROM favstation fs JOIN ev_stations s ON fs.station_id = s.id::varchar
          WHERE fs.email = $1 and fs.station_type = 'CAR'
      `, [email]);
      return result.rows;
    }
  }
  async addFavStation(email, stationId, type) {
    console.log(email, stationId, type);
    const result = await pool.query(`
        INSERT INTO favstation (email, station_id, station_type)
        VALUES ($1, $2, $3)
    `, [email, stationId, type]);
    return result.rowCount > 0;
  }
  async deleteFavStation(email, stationId, type) {
    const result = await pool.query(`
        DELETE FROM favstation 
        WHERE email = $1 AND station_id = $2 AND station_type = $3
    `, [email, stationId, type]);
    return result.rowCount > 0;
  }

  // Retorna SOLO las ids de las estaciones favoritas de un usuario
  async getFavStationIds(email, type) {
    const result = await pool.query(`
      SELECT station_id 
      FROM favstation 
      WHERE email = $1 AND station_type = $2
    `, [email, type]);
    
    return new Set(result.rows.map(row => row.station_id));
  }
}

export default FavStationRepository;