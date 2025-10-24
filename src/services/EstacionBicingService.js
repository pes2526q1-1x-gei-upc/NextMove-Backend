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
 *  - Operativa: podemos alquilar y devolver bicicletas.
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
    console.log("Servicio EstacionBicinigService: getEstacionesFusionadas");
    try { 
        //Solicitamos los dos JSONs a la vez a la API.
        const [infoResponse, statusResponse] = await Promise.all([
            fetch(INFO_URL, configPeticion),
            fetch(ESTADO_URL, configPeticion)
        ]);

        //verficamos que las respuestas son correctas: 
        if(!infoResponse.ok || !statusResponse.ok) {
            throw new Error("Error en las respuestas de las APIs");
        }
        //convertimos las respuestas a JSON
        const [infoData, statusData] = await Promise.all([
            infoResponse.json(),
            statusResponse.json()
        ]);
        
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
                        lat: existeEstacionMapa.lat,
                        lon: existeEstacionMapa.lon
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
        console.error("Error al realizar las llamadas a las APIs:", error);
        if(error.response) {
            console.error("Código de estado:", error.response.status);
            console.error("Datos de la respuesta:", error.response.data);
        }
        if(error.response.status === 401) {
            console.error("Parece que el token de acceso no es válido.");
        }
        else {
            console.error("Error desconocido al realizar las llamadas a las APIs.");
        }
    }
}

//No generamos una dependencia circular porque únicamente usamos el worker para obtener las estaciones de bici cacheadas
export async function getEstacionFusionada(id) {
    console.log("Servicio EstacionBicinigService: getEstacionFusionada ID: " + id);
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
        console.log("SERVICE BICING: Tengo este número de estaciones de bicing cacheadas: " + estacionesCache.lenght); 
        return estacionesCache;
    }
} 

function coordenadasValidas(lat, lon) {
    //miramos que no sean vaías
    if(lat === null || lon === null) return false; 
    //en caso de ser no nulos, verificamos que sean números: 
    if(typeof lat !== 'number' || typeof lon !== 'number') return false; 
    else {
        //miramos sus rangos: 
        if(lat < -90 || lat > 90) return false; 
        if(lon < -180 || lon > 180) return false; 
        return true; 
    }
}

//Método para obtener las estaciones ordenadas por distancia: 
export async function getEstacionesBicingCercanas(location) {
    //en primer lugar vamos a verificar que las coordenadas son válidas:
    const {lat, lon, radiusKm = 5} = location; 
    if(coordenadasValidas(lat, lon)) {
        const estaciones = EstacionDeBicingSyncWorker.getEstacionesCache(); 
        if(!estaciones || estaciones === null) {
            console.log("SERVICE BICING: No tenemos estaciones cacheadas para ser ordenadas"); 
            return [];
        }
        //calculamos la distancia y filtramos por radio. Mapeamos el resultado. 
        const estacionesCercanas = estaciones
        .map(estacion => {
            const distance = calculateDistance(lat, lon, estacion.coordenadas.lat, estacion.coordenadas.lon); 
            //retornamos la estación original  con la distancia añadida: 
            return {
                ...estacion,
                distanciaKm: distance
            }; 
        })
        //solo falta filtrar para obtener las estaciones que estén dentro de ese perímetro: 
        .filter(estacion => estacion.distanciaKm >= 0) 
        //ordenamos las estaciones en orden ascedente: 
        .sort((a, b) => a.distanciaKm - b.distanciaKm); 
        console.log("ESTACIONES OBTENIDAS CERCA DE MI: " + estacionesCercanas.length); 
        return estacionesCercanas; 
    }
    //en caso de no ser coordenadas válidas:
    return null;
}


//getEstacionesBicingCercanas({lat: 41.123, lon: 121.12}); 