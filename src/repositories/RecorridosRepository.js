import pool from '../config/database.js';


/////////////////////////////////////////////////////////////////////

//Método de PostgreSQL a GrapQL de parseo de coordenadas. 
const parsePgPoint = (pgPointObject) => {
  if (!pgPointObject) return null;
  return { 
    latitude: pgPointObject.y, 
    longitude: pgPointObject.x
  };
};

//Método de JS a BD para parsear de Coordinates a POINT: 
const formatToPgPoint = (coords) => {
  if (!coords || coords.latitude === undefined || coords.longitude === undefined) {
    return null;
  }
  // Formato de cadena (x, y) donde x=Longitude (lon) e y=Latitude (lat)
  return `(${coords.longitude}, ${coords.latitude})`; 
};

// Formatea una fecha (Date, timestamp string o epoch ms) a "DD/MM/YYYY HH:mm:ss (UTC)"
const formatDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const pad = (n) => String(n).padStart(2, '0');
  const day = pad(date.getUTCDate());
  const month = pad(date.getUTCMonth() + 1);
  const year = date.getUTCFullYear();
  const hours = pad(date.getUTCHours());
  const minutes = pad(date.getUTCMinutes());
  const seconds = pad(date.getUTCSeconds());
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds} (UTC)`;
};

////////////////////////////////////////////////////////////////////////

class RecorridosRepository {
  /** clase que realiza las operaciones de acceso a los datos almacenados en BD */
    
  /** Método auxiliar para transformar la salida de BD {x, y} a objeto JS/GraphQL {lat, lon}. */
  _transformRecorrido(recorrido) {
    if (!recorrido) return null;

    const transformed = { ...recorrido };

    // Aplicamos el mapeo de nombres de propiedades
    transformed.origen = parsePgPoint(recorrido.origen);
    transformed.destino = parsePgPoint(recorrido.destino);

    // Formateamos la fecha para mostrar día/mes/año y hora (UTC)
    if (recorrido.fecha_recorrido) {
      transformed.fecha_recorrido = formatDate(recorrido.fecha_recorrido);
    }

    return transformed;
  }

  /** OBTIENE TODOS LOS RECORRIDOS REALIZADOS EN EL SISTEMA */
  async getAllRecorridos() {
    const result = await pool.query(`SELECT * FROM recorridos`); 
    return result.rows.map(recorrido => this._transformRecorrido(recorrido)); 
  }

  /** OBITENE UN RECORRIDO CONCRETO  */
  async getRecorridoById(id) {
    const result = await pool.query(`
            SELECT *
            FROM recorridos
            WHERE(id = $1)
        `, [id]); 
    return this._transformRecorrido(result.rows[0]) || null; 
  }

  /** OBITENE LOS RECORRIDOS REALIZADOS POR ESE USER */
  async getRecorridosByUser(user_email) {
    const result = await pool.query(`
            SELECT *
            FROM recorridos
            WHERE(user_email = $1)
        `, [user_email]); 
    return result.rows.map(recorrido => this._transformRecorrido(recorrido));    //map lo que hace es para elemento del array nos permite aplicar un metodo. 
  }

  /** HACE EL INSERT DEL RECORRIDO EN LA BD*/
  /** En este caso podemos tener un error de constraint al insertar algún dato que nos viole algunta RI */
  async saveRecorrido(recorridoData) {
    const pointOrigen = formatToPgPoint(recorridoData.origen); 
    const  pointDestino = formatToPgPoint(recorridoData.destino); 
    //console.log('datos de recorrido: ' + recorridoData); 
    try {
      let fechaParam = recorridoData.fecha_recorrido;
      // Si no se proporciona fecha_recorrido, usar la fecha actual en ISO
      if (fechaParam === undefined || fechaParam === null || fechaParam === '') {
        fechaParam = new Date().toISOString();
      } else {
        // Si es un número o una cadena numérica, interpretarlo como epoch ms
        if (typeof fechaParam === 'number' || /^[0-9]+$/.test(String(fechaParam))) {
          fechaParam = new Date(Number(fechaParam)).toISOString();
        }
      }
      const result = await pool.query(`
                    INSERT INTO recorridos(user_email, distancia, velocidad_media, co2, kcal, origen, destino, fecha_recorrido)
                    VALUES($1, $2, $3, $4, $5, $6, $7, $8)
                    RETURNING *`, 
      [
        recorridoData.user_email, 
        recorridoData.distancia, 
        recorridoData.velocidad_media, 
        recorridoData.co2, 
        recorridoData.kcal, 
        //coordenadas ya parseadas
        pointOrigen, 
        pointDestino, 
        fechaParam
      ]); 
      return this._transformRecorrido(result.rows[0]); 
    } catch (error) {
      throw error; 
    }
  }

  /** ACTUALIZA EL RECORRIDO DEL USER EN CASO DE HABER ALGÚN ERROR (muy poco probable) de forma dinámica (aquellos campos que queramos) */
  async updateRecorrido(id, recorridoNuevaData) {
    const fields = [] ; 
    const values = []; 
    let paramIndex = 1; //primero apunta al primer argumento que pasamos. 

    if (recorridoNuevaData.user_email !== undefined && recorridoNuevaData.user_email !== null) {
      fields.push(`user_email = $${paramIndex++}`); 
      values.push(recorridoNuevaData.user_email); 
    }
        
    if (recorridoNuevaData.distancia !== undefined && recorridoNuevaData.distancia !== null) {
      fields.push(`distancia = $${paramIndex++}`); 
      values.push(recorridoNuevaData.distancia); 
    }

    if (recorridoNuevaData.velocidad_media !== undefined && recorridoNuevaData.velocidad_media !== null) {
      fields.push(`velocidad_media = $${paramIndex++}`) ; 
      values.push(recorridoNuevaData.velocidad_media); 
    }

    if (recorridoNuevaData.co2 !== undefined && recorridoNuevaData.co2 !== null) {
      fields.push(`co2 = $${paramIndex++}`); 
      values.push(recorridoNuevaData.co2); 
    }

    if (recorridoNuevaData.kcal !== undefined && recorridoNuevaData.kcal !== null) {
      fields.push(`kcal = $${paramIndex++}`); 
      values.push(recorridoNuevaData.kcal); 
    }

    if (recorridoNuevaData.origen !== undefined && recorridoNuevaData.origen !== null) {
      fields.push(`origen = $${paramIndex++}`); 
      //parseamos antes de pushear el valor.
      values.push(formatToPgPoint(recorridoNuevaData.origen)); 
    }

    if (recorridoNuevaData.destino !== undefined && recorridoNuevaData.destino !== null) {
      fields.push(`destino = $${paramIndex++}`); 
      //parseamos antes de insertar. 
      values.push(formatToPgPoint(recorridoNuevaData.destino)); 
    }

    if (recorridoNuevaData.fecha_recorrido !== undefined && recorridoNuevaData.fecha_recorrido !== null) {
      fields.push(`fecha_recorrido = $${paramIndex++}`); 
      // soportar epoch ms (number o string) -> convertir a ISO antes de insertar
      let fechaVal = recorridoNuevaData.fecha_recorrido;
      if (typeof fechaVal === 'number' || /^[0-9]+$/.test(String(fechaVal))) {
        fechaVal = new Date(Number(fechaVal)).toISOString();
      }
      values.push(fechaVal);
    }
        
    //caso en en el que no hay ningún campo que actualizar ==> retornamos este mismo recorrido. 
    if (fields.length === 0) {
      return await this.getRecorridoById(id);
    }

    values.push(id); 

    const query = `
            UPDATE recorridos
            SET ${fields.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING *
            `;
    try {
      const result = await pool.query(query, values); 
      return this._transformRecorrido(result.rows[0]) || null; 
    } catch (error) {
      throw error;
    }
  }
    
  /** ELIMINA EL RECORRIDO CONCRETO */
  async deleteRecorrido(id) {
    const result = await pool.query(`
        DELETE FROM recorridos WHERE id = $1`, [id]);
    return result.rowCount > 0; //en el caso de que si elimine el where se evalua a true y se suprime la fila. 
  }
}

export default RecorridosRepository; 