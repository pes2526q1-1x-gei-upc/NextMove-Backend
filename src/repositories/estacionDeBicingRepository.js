import pool from '../config/database.js';

///////////////////////////////////////////////////////////////////////////////////
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

  if (!coords || coords.latitude === undefined || coords.longitude === undefined) {
    return null;
  }

  // Formato de cadena (x, y) donde x=Longitude (lon) e y=Latitude (lat)
  return `(${coords.longitude}, ${coords.latitude})`;
};

//Método que nos parse el contenido que recibimos por parte de la API a contenido insertable para la BD: 
// const parseApiToDbFormat = (apiData) => {
//   if (!apiData) return null;
//   //Prefiere primero station_id, sino id, sino null. 
//   const id = apiData.station_id || apiData.id || null;
//   //ídem. para nombre.
//   const nombre = apiData.name || apiData.nombre || null;
//   //ídem. para dirección. 
//   const direccion = apiData.address || apiData.direccion || null;
//   //ídem para plazasTotales.
//   const plazasTotales = apiData.capacity || apiData.plazasTotales || null;

//   // Coordenadas: intenta lat/lon directo o alternativas sencillas
//   const lat = apiData.lat || apiData.latitude || (apiData.coordenadas && (apiData.coordenadas.latitude || apiData.coordenadas.lat)) || null;
//   const lon = apiData.lon || apiData.longitude || (apiData.coordenadas && (apiData.coordenadas.longitude || apiData.coordenadas.lon)) || null;
//   const coordenadas = (lat && lon) ? formatToPgPoint({latitude: lat, longitude: lon}) : null;

//   const estacionCargaElectrica = (apiData.physical_configuration === "ELECTRICBIKESTATION") || (apiData.is_charging_station === true);

//   return {
//     id,
//     nombre,
//     direccion,
//     plazasTotales,
//     coordenadas,
//     estacionCargaElectrica
//   };
// };

// Nuevo helper: normaliza el id para que siempre tenga un único sufijo "_BIKE"
const normalizeBicingId = (rawId) => {
  if (rawId === null || rawId === undefined) return rawId;
  const s = String(rawId).trim();
  // eliminar sufijos anteriores (_BICING o _BIKE) y añadir un único _BIKE
  const base = s.replace(/(_BICING|_BIKE)+$/i, '');
  return `${base}_BIKE`;
};

//////////////////////////////////////////////////////////////////////////////////

class EstacionDeBicingRepository {
  /** clase que realiza l as operaciones de acceso a los datos de la BD y a su almacenado */
  /** Método auxiliar para transofrmar la salida de BD a a objeto JS / GraphQL */
  _transformEstacion(estacion) {
    if (!estacion) return null;
    const transformed = { ...estacion };

    // Normalizar id para evitar formatos mixtos (esto asegura que la caché y la fusión usen el mismo id)
    if ('id' in transformed && transformed.id !== undefined && transformed.id !== null) {
      transformed.id = normalizeBicingId(transformed.id);
    }

    // Renombra los campos de la BD a camelCase para GraphQL/API
    if ('plazastotales' in transformed) {
      transformed.plazasTotales = transformed.plazastotales;
      delete transformed.plazastotales;
    }
    if ('estacioncargaelectrica' in transformed) {
      transformed.estacionCargaElectrica = transformed.estacioncargaelectrica;
      delete transformed.estacioncargaelectrica;
    }
    //aplicamos el mapeo para las coordenadas:
    transformed.coordenadas = parsePgPoint(estacion.coordenadas);
    return transformed;
  }

  /** MÉTODO QUE OBTIENE TODAS LAS ESTACIONES DE BICING DEL SISTEMA */
  async getAllEstacionesDeBicing() {
    // Evitar devolver duplicados accidentales y asegurar una sola fila por id
    const result = await pool.query(`
            SELECT DISTINCT ON (id) *
            FROM EstacionBicing
            ORDER BY id
    `);
    return result.rows.map(estacion => this._transformEstacion(estacion));
  }

  /** MÉTODO QUE OBTIENE LA ESTACIÓN CON EL ID QUE SE PRECISA */
  async getEstacionDeBicingById(id) {
    // Normalizar id de entrada para asegurar coincidencia con el formato almacenado
    const normalizedId = normalizeBicingId(id);
    const result = await pool.query(`
            SELECT *
            FROM EstacionBicing
            WHERE (id = $1)
            `, [normalizedId]);
    return this._transformEstacion(result.rows[0]) || null;
  }

  /** MÉTODO QUE OBTIENE LAS ESTACIONES DADA UNA DIRECCIÓN CÓMO PARAÁMETRO DE ENTRADA */
  async getEstacionesPorDireccion(address) {
    const query = `
      SELECT *
      FROM estacionbicing
      WHERE direccion ILIKE $1
      ORDER BY nombre
    `; 
    try {
      const result = await pool.query(query, [`%${address}%`]); 
      console.log('REPO, NUMERO DE TUPLAS DESPUES DE BUSCAR POR DIR ' + result.rowCount);
      return result.rows.map(estacion => this._transformEstacion(estacion));
    } catch (error){
      console.error('Error al buscar estaciones por dirección'); 
      throw error; 
    }
  }

  /** MÉTODO QUE INSERTA LA ESTACIÓN EN LA BD */
  async createEstacionDeBicing(dataEstacion) {
    // Normalizar id antes de insertar
    const idToInsert = normalizeBicingId(dataEstacion.id);
    //parseamos las coordenadas:
    const PointCoordenadas = formatToPgPoint(dataEstacion.coordenadas);
    
    const client = await pool.connect(); 

    try {
      //iniciamos la transacción: 
      await client.query('BEGIN'); 

      //insertamos en la tabla de stations (es la PPAL de las dos). 
      await client.query(`
        INSERT INTO station(id) 
        VALUES($1)`, [idToInsert]
      );

      const result = await client.query(`
                INSERT INTO EstacionBicing(id, nombre, direccion, plazastotales, coordenadas, estacioncargaelectrica)
                VALUES($1, $2, $3, $4, $5, $6)
                RETURNING *`,
      [
        idToInsert,
        dataEstacion.nombre,
        dataEstacion.direccion,
        dataEstacion.plazasTotales,
        PointCoordenadas,
        dataEstacion.estacionCargaElectrica
      ]);

      //confrimamos la transacción (en el caso de que ambas inserciones sean exitosas): 
      await client.query('COMMIT'); 

      return this._transformEstacion(result.rows[0]);  
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      //liberamos el cliente: 
      client.release(); 
    }
  }

  /** MÉTODO QUE ACTUALIZA LA ESTACIÓN QUE SE PRECISA CON EL ID COMO PARÁMETRO DE ENTRADA */
  async updateEstacionDeBicing(id, changingData) {
    const fields  = [];
    const values = [];
    let paramIndex = 1; //apunta al primer campo que se precisa modifica $1.

    //analizamos que campos se quieren modificar:
    if (changingData.nombre !== undefined) {
      fields.push(`nombre = $${paramIndex++}`);
      values.push(changingData.nombre);
    }

    if (changingData.direccion !== undefined) {
      fields.push(`direccion = $${paramIndex++}`);
      values.push(changingData.direccion);
    }

    if (changingData.plazasTotales !== undefined) {
      fields.push(`plazastotales = $${paramIndex++}`);
      values.push(changingData.plazasTotales);
    }

    if (changingData.coordenadas !== undefined) {
      fields.push(`coordenadas = $${paramIndex++}`);
      values.push(formatToPgPoint(changingData.coordenadas));
    }

    if (changingData.estacionCargaElectrica !== undefined) {
      fields.push(`estacioncargaelectrica = $${paramIndex++}`);
      values.push(changingData.estacionCargaElectrica);
    }

    //analizamos el campo de fields:
    if (fields.length  === 0) {
      console.log("La estación que quieres modificar no tiene ningún campo para modificar!");
      const estacionActual = await this.getEstacionDeBicingById(id);
      //estacionActual ya está parseada.
      return estacionActual;
    }
        
    //añadimos al final de todo el id:
    values.push(normalizeBicingId(id));

    const query = `
            UPDATE EstacionBicing
            SET ${fields.join(', ')}
            WHERE (id = $${paramIndex})
            RETURNING *`;

    // eslint-disable-next-line no-useless-catch
    try {
      const result = await pool.query(query, values);
      return this._transformEstacion(result.rows[0]) || null;  

    } catch (error) {
      throw error;
    }
  }

  /** MÉTODO QUE ELIMINA LA ESTACIÓN QUE PRECISAMOS */
  async deleteEstacionBicing(id) {
    // eslint-disable-next-line no-useless-catch
    try {
      const normalizedId = normalizeBicingId(id);
      const result = await pool.query(`
                DELETE FROM EstacionBicing WHERE(id = $1)`, [normalizedId]);
      return result.rowCount > 0;
    } catch (error) {
      throw error;
    }
  }

  /** MÉTODO DE SINCRONIZACIÓN  MASIVA NECESARIO PARA REALIZAR LAS ACTUALIZACIONES CADA 24 horas. 
     * Estrategia usada: doble upsert. 
     * Hacemos uso de una TRANSACCIÓN SQL para garantizar que los datos no se corrompan. 
     */
  async sincronizarEstacionesDeBicingMasivamente(estacionesDataAPI) {
    if (!estacionesDataAPI || estacionesDataAPI.length === 0) {
      console.log("estacionDeBicingRepository: No hay datos de API para sincronizar."); 
      return {count: 0, success: true}; 
    }

    //información para realizar las quieries de inserció para la relación de bicing
    const bicingPlaceHolders = []; 
    const bicingValues = []; 
    //ídem para stations: 
    const stationPlaceHolders = []; 
    const stationValues = []; //en este caso solo almacenamos los ids de las estaciones, nada más. 

  
    //Preparamos los datos para poder realizar las inserciones de forma correcta en estacionbicing
    estacionesDataAPI.forEach((raw, index) => {
      const estacion = { ...raw, id: normalizeBicingId(raw.id) };
      const start = index * 6;
      const stationIndex = index + 1; //para stations. 
      bicingPlaceHolders.push(`($${start + 1}, $${start + 2}, $${start + 3}, $${start + 4}, $${start + 5}, $${start + 6})`);
      bicingValues.push(
        estacion.id,
        estacion.nombre,
        estacion.direccion,
        estacion.plazasTotales,
        formatToPgPoint(estacion.coordenadas),
        estacion.estacionCargaElectrica
      ); 

      //Ídem. pero aplicado a stations
      stationPlaceHolders.push(`($${stationIndex})`); 
      stationValues.push(estacion.id); 
    });
    
    const client = await pool.connect();
    try {
      await client.query(`BEGIN`); //1. INICIAMOS LA TRANSACCIÓN
      console.log("estacionDeBicingRepository: Iniciando sincronización masiva: Eliminando datos estáticos antiguos...");


      //inserciones en relación stations: 
      const stationInsertQuery = `
        INSERT INTO stations(id)
        VALUES ${stationPlaceHolders.join(', ')}
        ON CONFLICT (id) DO NOTHING
      `; 
      await client.query(stationInsertQuery, stationValues); 

      const bicingInsertQuery = `
            INSERT INTO EstacionBicing(id, nombre, direccion, plazastotales, coordenadas, estacioncargaelectrica)
            VALUES ${bicingPlaceHolders.join(', ')}
            ON CONFLICT (id) DO UPDATE SET
                nombre = EXCLUDED.nombre,
                direccion = EXCLUDED.direccion,
                plazastotales = EXCLUDED.plazastotales,
                coordenadas = EXCLUDED.coordenadas,
                estacioncargaelectrica = EXCLUDED.estacioncargaelectrica
            RETURNING id
        `;
      //Realizamos la query de inserción : 
      const result = await client.query(bicingInsertQuery, bicingValues); 

      //4. CERRRAMOS LA TRANSACCIÓN: 
      await client.query(`COMMIT`); 
      console.log(`estacionDeBicingRepository: Sincronización masiva de estaciones completada con éxito. Registros insertados: ${result.rowCount}.`);
      //Retornamos el númeor de tuplas insertadas en la BD: 
      return {count: result.rowCount,  success: true};  
    } catch (e) {
      //5. EN CASO DE ERROR, DESHACEMOS LOS CAMBIOS REALIZADOS EN LA BD: 
      await client.query(`ROLLBACK`); 
      console.error("estacionDeBicingRepository: Error en la sincronización masiva de estaciones, deshaciendo cambios...", e.message) ; 
      throw new Error("Fallo de Sincronización masiva de datos estáticos de estaciones"); 
    } finally {
      client.release(); 
    }
  }
}

export default EstacionDeBicingRepository;

/*
Opcional (recomendado): crear trigger en la BD para forzar la normalización del id
Ejecútalo como migration / psql una sola vez. Esto asegura que cualquier INSERT/UPDATE
desde cualquier fuente almacene el id con sufijo '_BIKE'.

-- SQL para migration:
CREATE OR REPLACE FUNCTION ensure_bicing_id_suffix() RETURNS trigger AS $$
BEGIN
  IF NEW.id IS NOT NULL THEN
    NEW.id := regexp_replace(NEW.id::text, '(_BICING|_BIKE)+$', '', 'gi') || '_BIKE';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_normalize_bicing_id ON "EstacionBicing";
CREATE TRIGGER trg_normalize_bicing_id
BEFORE INSERT OR UPDATE ON "EstacionBicing"
FOR EACH ROW EXECUTE FUNCTION ensure_bicing_id_suffix();

-- Nota: ajusta comillas o schema según tu esquema real.
*/