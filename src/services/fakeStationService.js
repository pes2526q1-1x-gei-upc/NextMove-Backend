//lógica de servicio  para obtener los datos de la estación: 
import {fakeStationData} from "./fakeStations.js"; 

/** Ahora lo que debemos hacer es buscar lo que nos interesa de la estación
 */

//2. Función para obtener los datos de la estación
//la vamos a definir como asincrona para simular una llamada a una API
export const getFakeStation = async (stationId) => {

    //simulamos el tiempo de espera de una llamada a una API
    await new Promise((resolve) => setTimeout(resolve, 200));
    //AHROA LO QUE TENEMOS ES UNA LISTA DE ESTACIONES EN EL MOCK, ASÍ QUE DEBEMOS BUSCAR LA QUE NOS INTERESA
    const estacionBici = fakeStationData.find(s => s.station_id === stationId); 
    return estacionBici || null; 
 }

//método para obtener todas las estaiones: 
export const getFakeStations = async () => {
    return fakeStationData;
}