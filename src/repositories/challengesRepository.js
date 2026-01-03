import pool from '../config/database.js';

class ChanllengesRepository{
  async getAllChallenges() {
    const result = await pool.query(`
      SELECT r.* ,
             e.nombre as company_name,
             e.email as company_email,
             e.url as company_url,
             e.descripcion as company_description,
             e.logo_url as company_logo_url,
             ST_Y(e.ubicacion::geometry) as company_latitude,
             ST_X(e.ubicacion::geometry) as company_longitude
      FROM retos r
      JOIN empresas e ON r.empresa_id = e.id
      ORDER BY ending_date ASC
    `);
    return result.rows.map(row => ({
      ...row,
      starting_date: Date.parse(row.starting_date).toString(),
      ending_date: Date.parse(row.ending_date).toString(),
      company: {
        name: row.company_name,
        email: row.company_email,
        url: row.company_url,
        description: row.company_description,
        logo_url: row.company_logo_url,
        location: row.company_latitude && row.company_longitude ? {
          latitude: parseFloat(row.company_latitude),
          longitude: parseFloat(row.company_longitude)
        } : null
      }
    }));
  }
  async enrollChallenge(challengeData) {
    const {challenge_id, email} = challengeData;
    const result = await pool.query(`
        INSERT INTO usuario_retos (email, id, total_distance)
        VALUES ($1, $2::varchar(50), (select distance from retos where id = $2::varchar(50)))
    `, [email, challenge_id]);
    return result.rowCount > 0;
  }
  async getEnrolledChallenges(email)
  {
    const result = await pool.query(`
        SELECT r.*,
               e.nombre as company_name,
               e.email as company_email,
               e.url as company_url,
               e.descripcion as company_description,
               e.logo_url as company_logo_url,
               ST_Y(e.ubicacion::geometry) as company_latitude,
               ST_X(e.ubicacion::geometry) as company_longitude,
               ur.completed,
               ur.total_distance,
               ur.current_distance
        FROM usuario_retos ur
        JOIN retos r ON ur.id = r.id
        JOIN empresas e ON r.empresa_id = e.id
        WHERE ur.email = $1 AND active = true
    `, [email]);
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      distance: row.distance,
      description: row.description,
      points: row.points,
      starting_date: Date.parse(row.starting_date).toString(),
      ending_date: Date.parse(row.ending_date).toString(),
      photo: row.photo,
      company: {
        name: row.company_name,
        email: row.company_email,
        url: row.company_url,
        description: row.company_description,
        logo_url: row.company_logo_url,
        location: row.company_latitude && row.company_longitude ? {
          latitude: parseFloat(row.company_latitude),
          longitude: parseFloat(row.company_longitude)
        } : null
      },
      completed: row.completed,
      total_distance: row.total_distance,
      current_distance: row.current_distance
    }));
  }
  async getTrophies(email)
  {
    const result = await pool.query(`
        SELECT r.name FROM usuario_retos ur join retos r on ur.id = r.id 
        WHERE ur.email = $1 AND ur.completed = 100
    `, [email]);
    return result.rows;
  }

  async getPromotedCompanies() {
    const result = await pool.query(`
      SELECT nombre, descripcion, email, url, logo_url,
             ST_Y(ubicacion::geometry) as latitude,
             ST_X(ubicacion::geometry) as longitude
      FROM empresas
    `);
    return result.rows.map(row => ({
      name: row.nombre,
      description: row.descripcion,
      email: row.email,
      url: row.url,
      logo_url: row.logo_url,
      location: {
        latitude: parseFloat(row.latitude),
        longitude: parseFloat(row.longitude)
      }
    }));
  }
}

export default ChanllengesRepository;