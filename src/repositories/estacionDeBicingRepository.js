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

    // Formato de cadena (x, y) donde x=Longitude (lon) e y=Latitude (lat)
    return `(${coords.longitude}, ${coords.latitude})`;
};

//Método que nos parse el contenido que recibimos por parte de la API a contenido insertable para la BD: 
// const parseApiToDbFormat = (apiData) => {
//     if (!apiData) return null;
//     //Prefiere primero station_id, sino id, sino null. 
//     const id = apiData.station_id || apiData.id || null;
//     //ídem. para nombre.
//     const nombre = apiData.name || apiData.nombre || null;
//     //ídem. para dirección. 
//     const direccion = apiData.address || apiData.direccion || null;
//     //ídem para plazasTotales.
//     const plazasTotales = apiData.capacity || apiData.plazasTotales || null;

//     // Coordenadas: intenta lat/lon directo o alternativas sencillas
//     const lat = apiData.lat || apiData.latitude || (apiData.coordenadas && (apiData.coordenadas.latitude || apiData.coordenadas.lat)) || null;
//     const lon = apiData.lon || apiData.longitude || (apiData.coordenadas && (apiData.coordenadas.longitude || apiData.coordenadas.lon)) || null;
//     const coordenadas = (lat && lon) ? formatToPgPoint({latitude: lat, longitude: lon}) : null;

//     const estacionCargaElectrica = (apiData.physical_configuration === "ELECTRICBIKESTATION") || (apiData.is_charging_station === true);

//     return {
//         id,
//         nombre,
//         direccion,
//         plazasTotales,
//         coordenadas,
//         estacionCargaElectrica
//     };
// };

//////////////////////////////////////////////////////////////////////////////////

class EstacionDeBicingRepository {
    /** clase que realiza l as operaciones de acceso a los datos de la BD y a su almacenado */
   
    /** Método auxiliar para transofrmar la salida de BD a a objeto JS / GraphQL */
    _transformEstacion(estacion) {
        if(!estacion) return null;
        const transformed = { ...estacion };
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
        const result = await pool.query(`
            SELECT *
            FROM EstacionBicing`);
        return result.rows.map(estacion => this._transformEstacion(estacion));
    }



    /** MÉTOD QUE OBTIENE LA ESTACIÓN CON EL ID QUE SE PRECISA */
    async getEstacionDeBicingById(id) {
        const result = await pool.query(`
            SELECT *
            FROM EstacionBicing
            WHERE (id = $1)
            `, [id]);
        return this._transformEstacion(result.rows[0]) || null;
    }

    /** MÉTODO QUE INSERTA LA ESTACIÓN EN LA BD */
    async createEstacionDeBicing(dataEstacion) {
        const PointCoordenadas = formatToPgPoint(dataEstacion.coordenadas);
        const result = await pool.query(`
            INSERT INTO EstacionBicing(id, nombre, direccion, plazastotales, coordenadas, estacioncargaelectrica)
            VALUES($1, $2, $3, $4, $5, $6)
            RETURNING *`,
            [
                dataEstacion.id,
                dataEstacion.nombre,
                dataEstacion.direccion,
                dataEstacion.plazasTotales,
                PointCoordenadas,
                dataEstacion.estacionCargaElectrica
            ]);
        return this._transformEstacion(result.rows[0]);
    }


    /** MÉTODO QUE ACTUALIZA LA ESTACIÓN QUE SE PRECISA CON EL ID COMO PARÁMETRO DE ENTRADA */
    async updateEstacionDeBicing(id, changingData) {
        const fields  = [];
        const values = [];
        let paramIndex = 1; //apunta al primer campo que se precisa modifica $1.

        //analizamos que campos se quieren modificar:
        if(changingData.nombre !== undefined) {
            fields.push(`nombre = $${paramIndex++}`);
            values.push(changingData.nombre);
        }

        if(changingData.direccion !== undefined) {
            fields.push(`direccion = $${paramIndex++}`);
            values.push(changingData.direccion);
        }

        if(changingData.plazasTotales !== undefined) {
            fields.push(`plazastotales = $${paramIndex++}`);
            values.push(changingData.plazasTotales);
        }

        if(changingData.coordenadas !== undefined) {
            fields.push(`coordenadas = $${paramIndex++}`);
            values.push(formatToPgPoint(changingData.coordenadas));
        }

        if(changingData.estacionCargaElectrica !== undefined) {
            fields.push(`estacioncargaelectrica = $${paramIndex++}`);
            values.push(changingData.estacionCargaElectrica);
        }

        //analizamos el campo de fields:
        if(fields.length  === 0) {
            console.log("La estación que quieres modificar no tiene ningún campo para modificar!");
            const estacionActual = await this.getEstacionDeBicingById(id);
            //estacionActual ya está parseada.
            return estacionActual;
        }
        
        //añadimos al final de todo el id:
        values.push(id);

        const query = `
            UPDATE EstacionBicing
            SET ${fields.join(', ')}
            WHERE (id = $${paramIndex})
            RETURNING *`;

        const result = await pool.query(query, values);
        return this._transformEstacion(result.rows[0]) || null;
    }

    /** MÉTODO QUE ELIMINA LA ESTACIÓN QUE PRECISAMOS */
    async deleteEstacionBicing(id) {
        const result = await pool.query(`
            DELETE FROM EstacionBicing WHERE(id = $1)`, [id]);
        return result.rowCount > 0;
    }

    /** MÉTODO DE SINCRONIZACIÓN  MASIVA NECESARIO PARA REALIZAR LAS ACTUALIZACIONES CADA 24 horas. 
     * Estrategia usada: DELETE ALL + INSERT BATCH, es la forma más eficiente de hacerlo en lugar de UPSERT. 
     * Hacemos uso de una TRANSACCIÓN SQL para garantizar que los datos no se corrompan. 
     */

    async sincronizarEstacionesDeBicingMasivamente(estacionesDataAPI) {
        if(!estacionesDataAPI || estacionesDataAPI.length === 0) {
            console.log("estacionDeBicingRepository: No hay datos de API para sincronizar."); 
            return {count: 0, success: true}; 
        }

        const client = await pool.connect();
        try {
            await client.query(`BEGIN`); //1. INICIAMOS LA TRANSACCIÓN
            console.log("estacionDeBicingRepository: Iniciando sincronización masiva: Eliminando datos estáticos antiguos...");
            //2. ELIMINAMOS TODOS LOS DATOS:
            await client.query(`DELETE FROM EstacionBicing`);  
            console.log("estacionDeBicingRepository: eliminación llevada a cabo con éxito! Preparamos las inserciones.");

            const placeHolders = []; 
            const values = []; 

            //3. PREPARAMOS LA INSERCIÓN MASIVA:
            estacionesDataAPI.forEach((estacion, index) => {
                const start = index * 6;
                placeHolders.push(`($${start + 1}, $${start + 2}, $${start + 3}, $${start + 4}, $${start + 5}, $${start + 6})`);
                values.push(
                    estacion.id,
                    estacion.nombre,
                    estacion.direccion, 
                    estacion.plazasTotales, 
                    formatToPgPoint(estacion.coordenadas),
                    estacion.estacionCargaElectrica
                ); 
            });

            const insertQuery = `
                INSERT INTO EstacionBicing(id, nombre, direccion, plazastotales, coordenadas, estacioncargaelectrica)
                VALUES ${placeHolders.join(', ')}
            `;

            //Realizamos la query de inserción : 
            const result = await client.query(insertQuery, values); 

            //4. CERRRAMOS LA TRANSACCIÓN: 
            await client.query(`COMMIT`); 
            console.log(`estacionDeBicingRepository: Sincronización masiva de estaciones completada con éxito. Registros insertados: ${result.rowCount}.`);
            //Retornamos el númeor de tuplas insertadas en la BD: 
            return {count: result.rowCount,  success: true};  
        }catch(e) {
            //5. EN CASO DE ERROR, DESHACEMOS LOS CAMBIOS REALIZADOS EN LA BD: 
            await client.query(`ROLLBACK`); 
            console.error("estacionDeBicingRepository: Error en la sincronización masiva de estaciones, deshaciendo cambios...", e.message) ; 
            throw new Error("Fallo de Sincronización masiva de datos estáticos de estaciones"); 
        }finally {
            client.release(); 
        }
    }
}

export default EstacionDeBicingRepository;