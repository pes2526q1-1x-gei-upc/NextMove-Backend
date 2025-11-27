import pool from '../config/database.js';

class AssessmentRepository {
  AssessmentInfocache = new Map();

  async createAssessment(AssessmentData) {
    const { email, station_id, score, comments } = AssessmentData;

    const user = await pool.query(`
        SELECT nickname FROM users WHERE email = $1
    `, [email]);
    
    if (user.rows.length === 0) throw new Error("Usuario no encontrado");
    const nickname = user.rows[0].nickname;

    await pool.query(`
        INSERT INTO valoracion (nickname, station_id, score, description, created_at)
        VALUES ($1, $2, $3, $4, NOW())
    `, [nickname, station_id, score, comments]);

    this.AssessmentInfocache.delete(station_id);

    const result = await pool.query(`
        SELECT avg(score) FROM valoracion
        WHERE station_id = $1
    `, [station_id]);
    
    return Number(result.rows[0].avg);
  }

  async DeleteAssessment(AssessmentData) {
    const { email, station_id } = AssessmentData;

    const user = await pool.query(`
        SELECT nickname FROM users WHERE email = $1
    `, [email]);
    
    if (user.rows.length === 0) throw new Error("Usuario no encontrado");
    const nickname = user.rows[0].nickname;

    await pool.query(`
        DELETE FROM valoracion
        WHERE nickname = $1 AND station_id = $2
    `, [nickname, station_id]);

    this.AssessmentInfocache.delete(station_id);

    const result = await pool.query(`
        SELECT avg(score) FROM valoracion
        WHERE station_id = $1
    `, [station_id]);

    return Number(result.rows[0].avg) || 0;
  }

  async EditAssessment(AssessmentData) {
    const { email, station_id, score, comments } = AssessmentData;

    const user = await pool.query(`
        SELECT nickname FROM users WHERE email = $1
    `, [email]);
    
    if (user.rows.length === 0) throw new Error("Usuario no encontrado");
    const nickname = user.rows[0].nickname;

    const fields = [];
    const values = [];
    let index = 1;

    if (score !== undefined) {
      fields.push(`score = $${index}`);
      values.push(score);
      index++;
    }
    if (comments !== undefined) {
      fields.push(`description = $${index}`);
      values.push(comments);
      index++;
    }

    fields.push(`created_at = NOW()`);

    values.push(nickname);
    values.push(station_id);

    await pool.query(`
        UPDATE valoracion
        SET ${fields.join(', ')}
        WHERE nickname = $${index} AND station_id = $${index + 1}
    `, values);

    this.AssessmentInfocache.delete(station_id);

    const result = await pool.query(`
        SELECT avg(score) FROM valoracion
        WHERE station_id = $1
    `, [station_id]);
    
    return Number(result.rows[0].avg);
  }

  async getAssessmentsByStationId(station_id) {
    const result = await pool.query(`
        SELECT nickname, score, description as comments, TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS.US') AS "created_at" 
        FROM valoracion
        WHERE station_id = $1
        ORDER BY created_at DESC
    `, [station_id]);
    
    return result.rows;
  }

  async getStationAssessmentInfo(station_id) {
    const cached = this.AssessmentInfocache.get(station_id);
    if (cached) {
      console.log(`Using cached AssessmentInfo for ${station_id}`);
      return cached;
    }

    console.log(`Cache miss for ${station_id}, querying DB...`);
    const result = await pool.query(`
        SELECT COALESCE(AVG(score), 0) AS "averageScore", COUNT(*) AS "totalAssessments" 
        FROM valoracion
        WHERE station_id = $1
    `, [station_id]);

    const info = {
      averageScore: parseFloat(result.rows[0].averageScore),
      totalAssessments: parseInt(result.rows[0].totalAssessments, 10) || 0
    };

    this.AssessmentInfocache.set(station_id, info);
    
    return info;
  }
}

export default AssessmentRepository;