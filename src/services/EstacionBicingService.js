import 'dotenv/config';
import { calculateDistance } from '../utils/maths.js'
import EstacionDeBicingSyncWorker from '../workers/EstacionDeBicingSyncWorker.js';


//TOKEN de acceso a la API (leído desde .env)
const TOKEN_DE_ACCESO_API = process.env.TOKEN_DE_ACCESO;

const INFO_URL ="https://opendata-ajuntament.barcelona.cat/data/dataset/bd2462df-6e1e-4e37-8205-a4b8e7313b84/resource/f60e9291-5aaa-417d-9b91-612a9de800aa/download"; 
        
const ESTADO_URL = "https://opendata-ajuntament.barcelona.cat/data/dataset/6aa3416d-ce1a-494d-861b-7bd07f069600/resource/1b215493-9e63-4a12-8980-2d7e0fa19f85/download";
        
//añadimos el token de acceso a la API en los headers de las peticiones
const configPeticion = {
    method: 'GET', 
    headers: {
        'Authorization': TOKEN_DE_ACCESO_API
    }
};  

//FUNCIÓN QUE DETERMINA EL ESTADO DE LA ESTACIÓN DE BICING: 
/** Cuatro estados posibles: 
 * - Operativa: podemos alquilar y devolver bicicletas.
 * - Solo_Alquiler: podemos alquilar bicicletas, pero no devolverlas.
 * - Solo_Devolucion: podemos devolver bicicletas, pero no alquilarlas.
 * - Fuera_de_Servicio: no podemos ni alquilar ni devolver bicicletas.
 */


function calcularEstadoEstacion(estacionEstado) {
    if(estacionEstado.is_renting && estacionEstado.is_returning) return "OPERATIVA"; 
    else if(estacionEstado.is_renting && !estacionEstado.is_returning) return "SOLO_ALQUILER";
    else if(!estacionEstado.is_renting && estacionEstado.is_returning) return "SOLO_ANCLAJE";
    else return "FUERA_DE_SERVICIO"; 
}

//FUNCIÓN PARA CALCULAR LAS PLAZAS OCUPADAS DE UNA ESTACIÓN:
function calcularPlazasOcupadas(anclajesDisponibles, plazasTotales) {
    return plazasTotales - anclajesDisponibles;
}

//FUNCIÓN PARA OBTENER Y FUSIONAR LOS DATOS DE LAS ESTACIONES DE BICING:
export async function getEstacionesFusionadas() {
    console.log("Servicio EstacionBicingService: getEstacionesFusionadas");
    
    // Estas variables se declaran aquí para que el bloque catch pueda acceder a sus cuerpos de texto
    let infoBody = '';
    let statusBody = '';
    let infoResponse;
    let statusResponse;

    try { 
        //Solicitamos los dos JSONs a la vez a la API.
        [infoResponse, statusResponse] = await Promise.all([
            fetch(INFO_URL, configPeticion),
            fetch(ESTADO_URL, configPeticion)
        ]);

        // Leemos ambas respuestas como texto
        [infoBody, statusBody] = await Promise.all([
            infoResponse.text(),
            statusResponse.text()
        ]);

        // Verificamos que las respuestas son correctas individualmente
        if (!infoResponse.ok) {
            console.error(`Error en la API INFO (${infoResponse.status} ${infoResponse.statusText}):`, infoBody);
            throw new Error(`Error en la API INFO: ${infoResponse.status}`);
        }
        if (!statusResponse.ok) {
            console.error(`Error en la API ESTADO (${statusResponse.status} ${statusResponse.statusText}):`, statusBody);
            throw new Error(`Error en la API ESTADO: ${statusResponse.status}`);
        }

        // Ahora intentamos parsear el texto a JSON
        // Si esto falla, el catch de abajo se activará y podrá mostrar el texto (HTML)
        const infoData = JSON.parse(infoBody);
        const statusData = JSON.parse(statusBody);
        
        console.log("Datos convertidos a JSON de forma correcta!"); 
        const estacionesInfo = infoData.data.stations;  //-- array de objetos.
        const estacionesStatus = statusData.data.stations; //-- ídem. 

        //para fusionar los datos, vamos a hacer uso de un Map<station_id, estacion>: 
        const StationsMap = new Map(); 

        //recorremos el array de info y lo volcamos en el Map:
        for(const estacionInfo of estacionesInfo) {
            StationsMap.set(estacionInfo.station_id, estacionInfo); //asignamos station_id como clave y la  información de la estación. 
        }

        //ahora recorremos el array de estados para fusionar su contenido. 
        const estacionesFusionadas = estacionesStatus.map(estacionEstado => {
            const existeEstacionMapa = StationsMap.get(estacionEstado.station_id); 
            //en primera instanica verificamos si la estación ya existe en el Map:  
            //console.log(estacionEstado);
            if(!existeEstacionMapa) {
                console.log("La estación con id " + estacionEstado.station_id + " no existe en el Map");
                return null; 
            }
            else {
                return {
                    //datos estáticos (proceden de estacionesInfo):
                    id: existeEstacionMapa.station_id,
                    nombre: existeEstacionMapa.name,
                    direccion: existeEstacionMapa.address,
                    coordenadas: {
                        latitude: existeEstacionMapa.lat,
                        longitude: existeEstacionMapa.lon
                    },
                    plazasTotales: existeEstacionMapa.capacity,
                    estacionCargaElectrica: existeEstacionMapa.physical_configuration === "ELECTRICBIKESTATION",
                    //datos dinámicos (proceden de estacionesEstado):
                    sePuedenAlquilarBicis: estacionEstado.is_renting === 1,
                    sePuedeAnclarBicis: estacionEstado.is_returning === 1,
                    anclajesDisponibles: estacionEstado.num_docks_available,
                    plazasOcupadas: calcularPlazasOcupadas(estacionEstado.num_docks_available, existeEstacionMapa.capacity),
                    bicisMecanicasDisponibles: estacionEstado.num_bikes_available_types.mechanical,
                    bicisElectricasDisponibles: estacionEstado.num_bikes_available_types.ebike,
                    estado: calcularEstadoEstacion(estacionEstado)
                 }      
             }
        })
        .filter(estacion => estacion !== null); //filtramos las estaciones nulas para que no aparezcan.)
        return estacionesFusionadas; //retorna el array fusionado.  PODEMOS FILTRAR PARA SUPRIMIR NULLS SI QUEREMOS.

    } catch (error) {
        console.error("Error al realizar las llamadas a las APIs:", error.name, error.message);

        // Si el error es de parseo JSON, mostramos el cuerpo que falló
        if (error.name === 'SyntaxError') {
            console.error("====================== ERROR DE PARSEO JSON ======================");
            console.error("La API devolvió algo que no es JSON (probablemente HTML).");
            
            // Comprobamos qué respuesta pudo fallar
            if (infoResponse && infoResponse.ok) {
                //console.error("Cuerpo de INFO_URL (que parecía OK):", infoBody);
            }
            if (statusResponse && statusResponse.ok) {
                console.error("Cuerpo de ESTADO_URL (que parecía OK):", statusBody);
            }
            console.log('infoResponse status:', infoResponse.status);
            console.log('statusResponse status:', statusResponse.status);
        }
        
        console.error("Stack trace:", error.stack);
        return []; // Siempre retornar array vacío en caso de error
    }
}

//No generamos una dependencia circular porque únicamente usamos el worker para obtener las estaciones de bici cacheadas
export async function getEstacionFusionada(id) {
    console.log("Servicio EstacionBicingService: getEstacionFusionada ID: " + id);
    const estaciones = EstacionDeBicingSyncWorker.getEstacionesCache(); 
    if(!estaciones || estaciones === null) {
        console.log("SERVICE BICING: No tenemos estaciones de bicing en caché"); 
        return null; 
    }
    //en este caso sí tenemos estaciones de bicing. 
    console.log("SERVICE BICING: Tenemos estaciones de bicing, un total de: " + estaciones.length); 
    //buscamos si existe o no la estación en concreto. 
    const estacionExistente = estaciones.find(estacion => estacion.id == id); 
    if(!estacionExistente || estacionExistente === null) {
        console.log("SERVICE BICING: La estación con id " + id + " no existe"); 
        return null; 
    }
    else {
        console.log("SERVICE BICING: La estación con id: " + id + " existe!!!"); 
        return estacionExistente;
    }
}


//Método que retorna las estaciones cacheadas en el worker: 
export async function getEstacionesCache() {
    const estacionesCache = EstacionDeBicingSyncWorker.getEstacionesCache(); 
    if(!estacionesCache || estacionesCache === null) {
        console.log("SERVICE BICING: Las estaciones cacheadas retornan null!"); 
        return null; 
    }
    else {
        // CORRECCIÓN: Era .lenght, lo he cambiado a .length
        console.log("SERVICE BICING: Tengo este número de estaciones de bicing cacheadas: " + estacionesCache.length); 
        return estacionesCache;
    }
} 

//Método para obtener las estaciones ordenadas por distancia: 
  export async function getEstacionesDeBicingCercanas(lat, lon, radius) {
    
    const estaciones = EstacionDeBicingSyncWorker.getEstacionesCache(); 
    if(!estaciones || estaciones === null) {
        console.log("SERVICE BICING: No tenemos estaciones cacheadas para ser ordenadas"); 
        return [];
    }
    const estacionesCercanas = estaciones
    .map(estacion => {
        // Asegúrate de que calculateDistance recibe los parámetros en el orden correcto
        const distance = calculateDistance(lat, lon, estacion.coordenadas.latitude, estacion.coordenadas.longitude); 
        return {
            ...estacion,
            distanciaKm: distance
        }; 
    })
    .filter(estacion => estacion.distanciaKm <= radius) 
    .sort((a, b) => a.distanciaKm - b.distanciaKm); 
    
    console.log("ESTACIONES OBTENIDAS CERCA DE MI: " + estacionesCercanas.length); 
    return estacionesCercanas; 
}