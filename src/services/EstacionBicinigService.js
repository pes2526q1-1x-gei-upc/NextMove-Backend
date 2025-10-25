import 'dotenv/config';
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
function calcularPlazasOcupadas(anclajesLibres, plazasTotales) {
    return plazasTotales - anclajesLibres;
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
                //datos estáticos (proceden de estacionesInfo): 
                return {
                    id: existeEstacionMapa.station_id,
                    nombre: existeEstacionMapa.name,
                    direccion: existeEstacionMapa.address,
                    coordenadas: {
                        latitud: existeEstacionMapa.lat,
                        longitud: existeEstacionMapa.lon
                    },
                    plazasTotales: existeEstacionMapa.capacity,
                    //datos dinámicos (proceden de estacionesEstado):
                    sePuedenAlquilarBicis: estacionEstado.is_renting === 1,
                    sePuedeAnclarBicis: estacionEstado.is_returning === 1,
                    anclajesLibres: estacionEstado.num_docks_available,
                    plazasOcupadas: calcularPlazasOcupadas(estacionEstado.num_docks_available, existeEstacionMapa.capacity),
                    bicisMecanicasDisponibles: estacionEstado.num_bikes_available_types.mechanical,
                    bicisElectricasDisponibles: estacionEstado.num_bikes_available_types.ebike,
                    estado: calcularEstadoEstacion(estacionEstado)
                 }      
             }
        })
        .filter(estacion => estacion !== null); //filtramos las estaciones nulas.)
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

//función para obtener una estación por su ID
export async function getEstacionFusionada(id) {
    const estacionesFusionadas = await getEstacionesFusionadas(); 
    if(!estacionesFusionadas) {
        console.log("No se han podido obtener las estaciones.");
        return null;    
    }
    else {
        //en caso de que sí hayan estaciones fusionadas, miramos de que exista la que nos precisan. 
        const estacionFusionadaEncontrada = estacionesFusionadas.find(estacion => estacion.id == id); 
        if(!estacionFusionadaEncontrada) {
            console.log("NO EXISTE LA ESTACIÓN CON ID: " + id);
            return null; 
        }
        else return estacionFusionadaEncontrada;
    }
}

//función para probar que la llamada a la API funciona correctamente
async function probar() {
    const datosFusionados = await getEstacionesFusionadas();
    if(!datosFusionados) {
        console.log("No se han podido obtener los datos fusionados.");
    }
    else {
        console.log("Datos fusionados obtenidos correctamente:");
        console.log(datosFusionados);
    }
}

//probar(); 
