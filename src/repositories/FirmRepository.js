import pool from '../config/database.js';

class FirmRepository {
  async getFirms() {
    const result =  await pool.query(`
      SELECT nombre, descripcion, email, url, ubicacion FROM empresas
    `);
    return result.rows.map(row => ({
      ...row,
      ubicacion: {
        latitude: parseFloat(row.ubicacion[0]),
        longitude: parseFloat(row.ubicacion[1])
      }
    }));
  }
  async getFirmByName(name) {
    const result =  await pool.query(`
      SELECT nombre, descripcion, email, url, ubicacion FROM empresas
      WHERE nombre = $1
    `, [name]);
    const row = result.rows[0];
    if (!row) return null;
    return {
      ...row,
      ubicacion: {
        latitude: parseFloat(row.ubicacion[0]),
        longitude: parseFloat(row.ubicacion[1])
      }
    };
  }
}

export default FirmRepository;