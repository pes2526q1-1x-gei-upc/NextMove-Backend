import pool from '../config/database.js';

export default class FavStationRepository {
  async getFavStations(email) {
    const result = await pool.query(`
            SELECT fs.station_id, s.name, s.location
            FROM favorite_stations fs
            JOIN stations s ON fs.station_id = s.id
            WHERE fs.user_email = $1
        `, [email]);
    return result.rows;
  }
}