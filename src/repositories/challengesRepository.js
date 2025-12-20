import pool from '../config/database.js';

class ChanllengesRepository{
  async getAllChallenges() {
    const result = await pool.query('SELECT * FROM retos order by ending_date ASC');
    return result.rows;
  }
  async enrollChallenge(challengeData) {
    const {challenge_id, email, total_distance} = challengeData;
    const result = await pool.query(`
        INSERT INTO usuario_retos (email, id, total_distance)
        VALUES ($1, $2, $3)
    `, [email, challenge_id, total_distance]);
    return result.rowCount > 0;
  }
  async getEnrolledChallenges(email)
  {
    const result = await pool.query(`
        SELECT r.* FROM usuario_retos ur join retos r on ur.id = r.id 
        WHERE ur.email = $1 and active = true
    `, [email]);
    return result.rows;
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