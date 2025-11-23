import pool from '../config/database.js';

class AssessmentRepository{

  AssessmentInfocache = new Map();

  async createAssessment(AssessmentData)
  {
    const {nickname, station_id, score, comments} = AssessmentData;
    this.AssessmentInfocache.delete(station_id);
    await pool.query(`
        INSERT INTO valoracion (nickname, station_id, score, description)
        VALUES ($1, $2, $3, $4)
        `, [nickname, station_id, score, comments]);
    const result = await pool.query(`
        SELECT avg(score) FROM valoracion
        WHERE station_id = $1
        `, [station_id]);
    return Number(result.rows[0].avg);
  }

  async DeleteAssessment(AssessmentData)
  {
    const {nickname, station_id} = AssessmentData;
    await pool.query(`
        DELETE FROM valoracion
        WHERE nickname = $1 AND station_id = $2
        `, [nickname, station_id]);
    const result = await pool.query(`
        SELECT avg(score) FROM valoracion
        WHERE station_id = $1
        `, [station_id]);
    return Number(result.rows[0].avg);
  }

  async EditAssessment(AssessmentData)
  {
    const {nickname, station_id, score, comments} = AssessmentData;
    const fields = [];
    const values = [];
    let index = 1;
    if (score !== undefined){
      fields.push(`score = $${index}`);
      values.push(score);
      index++;
    }
    if (comments !== undefined){
      fields.push(`description = $${index}`);
      values.push(comments);
      index++;
    }
    values.push(nickname);
    values.push(station_id);
    await pool.query(`
        UPDATE valoracion
        SET ${fields.join(', ')}
        WHERE nickname = $${index} AND station_id = $${index + 1}
        `, values);
    const result = await pool.query(`
        SELECT avg(score) FROM valoracion
        WHERE station_id = $1
        `, [station_id]);
    this.AssessmentInfocache.delete(station_id);
    return Number(result.rows[0].avg);
  }
  async getAssessmentsByStationId(station_id)
  {
    const result = await pool.query(`
        SELECT nickname, score, description as comments, TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS.US') AS "created_at" FROM valoracion
        WHERE station_id = $1
        `, [station_id]);
    console.log(result.rows);
    return result.rows;
  }

  async getStationAssessmentInfo(station_id)
  {
    const cached = this.AssessmentInfocache.get(station_id);
    if (cached){
      console.log("Using cached AssessmentInfo");
      return cached;
    }
    const result = await pool.query(`
        SELECT COALESCE(AVG(score), 0) AS "averageScore", COUNT(*) AS "totalAssessments" FROM valoracion
        WHERE station_id = $1
        `, [station_id]);
    this.AssessmentInfocache.set(station_id, {
      averageScore: parseFloat(result.rows[0].averageScore),
      totalAssessments: parseInt(result.rows[0].totalAssessments, 10) || 0
    });
    return {
      averageScore: parseFloat(result.rows[0].averageScore),
      totalAssessments: parseInt(result.rows[0].totalAssessments, 10) || 0
    };
  }
}

export default AssessmentRepository;