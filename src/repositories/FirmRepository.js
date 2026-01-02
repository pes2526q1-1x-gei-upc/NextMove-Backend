import pool from '../config/database.js';

class FirmRepository {
  async getFirms() {
    const result =  await pool.query(`
      SELECT * FROM empresas
    `);
    return result.rows;
  }
  async getFirmByName(name) {
    const result =  await pool.query(`
      SELECT * FROM empresas
      WHERE nombre = $1
    `, [name]);
    return result.rows[0];
  }
}

export default FirmRepository;