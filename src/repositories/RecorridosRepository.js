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
                recorridoData.fecha_recorrido
            ]); 
            return this._transformRecorrido(result.rows[0]); 
        } catch(error) {
            throw error; 
        }
    }

    /** ACTUALIZA EL RECORRIDO DEL USER EN CASO DE HABER ALGÚN ERROR (muy poco probable) de forma dinámica (aquellos campos que queramos) */
    async updateRecorrido(id, recorridoNuevaData) {
        const fields = [] ; 
        const values = []; 
        let paramIndex = 1; //primero apunta al primer argumento que pasamos. 

        if(recorridoNuevaData.user_email !== undefined) {
            fields.push(`user_email = $${paramIndex++}`); 
            values.push(recorridoNuevaData.user_email); 
        }
        
        if(recorridoNuevaData.distancia !== undefined) {
            fields.push(`distancia = $${paramIndex++}`); 
            values.push(recorridoNuevaData.distancia); 
        }

        if(recorridoNuevaData.velocidad_media !== undefined) {
            fields.push(`velocidad_media = $${paramIndex++}`) ; 
            values.push(recorridoNuevaData.velocidad_media); 
        }

        if(recorridoNuevaData.co2 !== undefined) {
            fields.push(`co2 = $${paramIndex++}`); 
            values.push(recorridoNuevaData.co2); 
        }

        if(recorridoNuevaData.kcal !== undefined) {
            fields.push(`kcal = $${paramIndex++}`); 
            values.push(recorridoNuevaData.kcal); 
        }

        if(recorridoNuevaData.origen !== undefined) {
            fields.push(`origen = $${paramIndex++}`); 
            //parseamos antes de pushear el valor.
            values.push(formatToPgPoint(recorridoNuevaData.origen)); 
        }

        if(recorridoNuevaData.destino !== undefined) {
            fields.push(`destino = $${paramIndex++}`); 
            //parseamos antes de insertar. 
            values.push(formatToPgPoint(recorridoNuevaData.destino)); 
        }

        if(recorridoNuevaData.fecha_recorrido !== undefined) {
            fields.push(`fecha_recorrido = $${paramIndex++}`); 
            values.push(recorridoNuevaData.fecha_recorrido); 
        }
        
        //caso en en el que no hay ningún campo que actualizar ==> retornamos este mismo recorrido. 
        if(fields.length === 0) {
            return this._transformRecorrido(getRecorridoById(id)); 
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
        }catch(error) {
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