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
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
};

// Nuevo helper: normaliza valores de fecha / epoch (s o ms) a ISO string o null
const toIsoDate = (value) => {
  if (value === undefined || value === null || value === '') return null;
  // Si es número o cadena numérica -> interpretarlo como epoch (s o ms)
  if (typeof value === 'number' || /^[0-9]+$/.test(String(value))) {
    let n = Number(value);
    // Si parece estar en segundos (<=10 dígitos), convertir a ms
    if (String(Math.trunc(Math.abs(n))).length <= 10) {
      n = n * 1000;
    }
    const d = new Date(n);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toISOString();
  }
  // Si es string fecha -> intentar parsear
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toISOString();
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

    if (recorrido.tiempo_inicio) {
      transformed.tiempo_inicio = formatDate(recorrido.tiempo_inicio); 
    }

    if (recorrido.tiempo_fin) {
      transformed.tiempo_fin = formatDate(recorrido.tiempo_fin); 
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
            ORDER BY fecha_recorrido DESC
        `, [user_email]); 
    return result.rows.map(recorrido => this._transformRecorrido(recorrido));    //map lo que hace es para elemento del array nos permite aplicar un metodo. 
  }

  /** HACE EL INSERT DEL RECORRIDO EN LA BD*/
  /** En este caso podemos tener un error de constraint al insertar algún dato que nos viole algunta RI */
  async saveRecorrido(recorridoData) {
    const pointOrigen = formatToPgPoint(recorridoData.origen); 
    const  pointDestino = formatToPgPoint(recorridoData.destino);
    const bike_photo = recorridoData.bike_photo;
    // eslint-disable-next-line no-useless-catch 
    try {
      // Normalizar fechas a ISO (acepta epoch en s o ms, o strings)
      let fechaParam = toIsoDate(recorridoData.fecha_recorrido);
      const tiempoIni = toIsoDate(recorridoData.tiempo_inicio); 
      const tiempoFin = toIsoDate(recorridoData.tiempo_fin); 

      // Si no se proporciona fecha_recorrido, usar la fecha actual en ISO
      if (fechaParam === null) {
        fechaParam = new Date().toISOString();
      }

      const result = await pool.query(`
                    INSERT INTO recorridos(user_email, distancia, velocidad_media, co2, kcal, origen, destino, fecha_recorrido, velocidad_maxima, elevacion_positiva, elevacion_negativa, tiempo_inicio, tiempo_fin)
                    VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
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
        fechaParam, 
        recorridoData.velocidad_maxima, 
        recorridoData.elevacion_positiva, 
        recorridoData.elevacion_negativa,
        // Usar las variables normalizadas
        tiempoIni,
        tiempoFin
      ]); 
      if (bike_photo) await pool.query(`UPDATE users SET points = points + 50 WHERE email = $1`, [recorridoData.user_email]);
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

    if (recorridoNuevaData.velocidad_maxima !== undefined && recorridoNuevaData.velocidad_maxima !== null) {
      fields.push(`velocidad_maxima = $${paramIndex++}`);  
      values.push((recorridoNuevaData.velocidad_maxima)); 
    }

    if (recorridoNuevaData.elevacion_positiva !== undefined && recorridoNuevaData.elevacion_positiva !== null) {
      fields.push(`elevacion_positiva = $${paramIndex++}`);  
      values.push(recorridoNuevaData.elevacion_positiva); 
    }

    if (recorridoNuevaData.elevacion_negativa !== undefined && recorridoNuevaData.elevacion_negativa !== null) {
      fields.push(`elevacion_negativa = $${paramIndex++}`);  
      values.push(recorridoNuevaData.elevacion_negativa); 
    }

    if (recorridoNuevaData.tiempo_inicio !== undefined && recorridoNuevaData.tiempo_inicio !== null) {
      fields.push(`tiempo_inicio = $${paramIndex++}`); 
      values.push(toIsoDate(recorridoNuevaData.tiempo_inicio));
    }
    
    if (recorridoNuevaData.tiempo_fin !== undefined && recorridoNuevaData.tiempo_fin !== null) {
      fields.push(`tiempo_fin = $${paramIndex++}`); 
      values.push(toIsoDate(recorridoNuevaData.tiempo_fin));
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
    // eslint-disable-next-line no-useless-catch
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