import pool from '../config/database.js';

class FirmRepository {
  async getFirms() {
    const result =  await pool.query(`
      SELECT nombre, descripcion, email, url, lat, lng FROM empresas
    `);
    return result.rows.map(row => ({
      nombre: row.nombre,
      descripcion: row.descripcion,
      email: row.email,
      url: row.url,
      ubicacion: {
        latitude: parseFloat(row.lat),
        longitude: parseFloat(row.lng)
      }
    }));
  }
  async getFirmByName(name) {
    const result =  await pool.query(`
      SELECT nombre, descripcion, email, url, lat, lng FROM empresas
      WHERE nombre = $1
    `, [name]);
    const row = result.rows[0];
    if (!row) return null;
    return {
      nombre: row.nombre,
      descripcion: row.descripcion,
      email: row.email,
      url: row.url,
      ubicacion: {
        latitude: parseFloat(row.lat),
        longitude: parseFloat(row.lng)
      }
    };
  }
}

export default FirmRepository;