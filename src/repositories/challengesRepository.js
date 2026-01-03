import pool from '../config/database.js';

class ChanllengesRepository{
  async getAllChallenges() {
    const result = await pool.query('SELECT r.* , e.nombre as company_name, e.url, e.logo_url, e.descripcion as company_description, e.email FROM retos r join empresas e on r.empresa_id = e.id order by ending_date ASC');
    return result.rows.map(row => ({
      ...row,
      company: {
        name: row.company_name, 
        photo: row.logo_url,
        url: row.url,
        description: row.company_description,
        email: row.email
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
        SELECT r.*, e.nombre as company_name, e.url, e.logo_url, e.descripcion as company_description, e.email FROM usuario_retos ur join retos r on ur.id = r.id join empresas e on r.empresa_id = e.id
        WHERE ur.email = $1 and active = true
    `, [email]);
    return result.rows.map(row => ({
      ...row,
      company: {
        name: row.company_name,
        photo: row.logo_url,
        url: row.url,
        description: row.company_description,
        email: row.email
      }
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
}

export default ChanllengesRepository;