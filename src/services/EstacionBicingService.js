import EstacionDeBicingSyncWorker from "../workers/EstacionDeBicingSyncWorker.js";
import EstacionDeBicingRepository from "../repositories/estacionDeBicingRepository.js";
import { calculateDistance } from "../utils/maths.js";

const estacionRepo = new EstacionDeBicingRepository(); 

//Método para obtener todas las estaciones de bicing de nuestro sistema: 
export function getEstaciones() {
  const estaciones = EstacionDeBicingSyncWorker.getEstacionesCache();
  if (!estaciones || estaciones.length === 0) {
    console.log("Bicing Service: No existen estaciones cacheadas en el sistema!");
    return null;
  }
  console.log("Atributos clave de cada estación:");
  estaciones.forEach((e, i) => {
    console.log(`Estación ${i + 1} (id: ${e.id}):\n` + JSON.stringify(e, null, 2));
  });
  console.log(`Bicing Service: El  número de estaciones que vamos a retornar es: ${estaciones.length}!`);
  return estaciones;
}

//Método para obtener la estación que precisamos como parámetro de entrada: 
export function getEstacionById(id) {
  const estaciones = EstacionDeBicingSyncWorker.getEstacionesCache();
  if (!estaciones || estaciones.length === 0) {
    console.log("Bicing Service: No existen estaciones de bicing en el sistema!"); 
    return null; 
  }
  const estacionResutlante = estaciones.find(estacion => estacion.id === id); 
  if (!estacionResutlante) {
    console.log("Bicing Service: No existe la estación con ese ID en el sistema."); 
    return null; 
  }
  return estacionResutlante; 
}


//Método para obtener las estaciones ordenadas por distancia: 
export function getEstacionesBicingCercanas(location, radiusKm = 5) {
  const lat = location.coordinates.latitude; 
  const lon = location.coordinates.longitude; 
  const estaciones = EstacionDeBicingSyncWorker.getEstacionesCache(); 
  console.log("Número de estacione cacheadas en cercanas antes de filtrar ni retornar nada: " + estaciones.length); 
  if (!estaciones || estaciones === null) {
    console.log("SERVICE BICING: No tenemos estaciones cacheadas para ser ordenadas"); 
    return [];
  }
  const estacionesCercanas = estaciones
    .map(estacion => {
      // Asegúrate de que calculateDistance recibe los parámetros en el orden correcto
      const distance = calculateDistance(lat, lon, estacion.coordenadas.latitude, estacion.coordenadas.longitude); 
      console.log("distancia calcuada para la estacion " + estacion.id + " es " + distance);
      return {
        ...estacion,
        distanciaKm: distance
      }; 
    })
    .filter(estacion => estacion.distanciaKm <= radiusKm) 
    .sort((a, b) => a.distanciaKm - b.distanciaKm); 
    
  console.log("ESTACIONES OBTENIDAS CERCA DE MI: " + estacionesCercanas.length); 
  return estacionesCercanas; 
}


//Método para obtener las estaciones por dirección: 
export async function getEstacionesPorDireccion(address) {
  console.log("Bicing Service: El patrón que estamos buscando es " + address); 

  //obtenemos las estaciones cacheadas en nuesrto sistema: 
  const estaciones = await estacionRepo.getEstacionesPorDireccion(address);
  
  console.log("SERVICE: El repo me ha retornado este numeros de estaciones con ese patron de dir: " + estaciones.length);
  if (!Array.isArray(estaciones) || estaciones.length === 0) {
    console.log("Bicing Service: No hay estaciones para esta dir"); 
    return []; 
  }
  
  //Ahora haremos que retornen todas las estaciones con datos dinámicos también
  const estacionesResultantes = []; 
  for (let i = 0; i < estaciones.length; i++) {
    estacionesResultantes.push(getEstacionById(estaciones[i].id)); 
  }
  
  if (!estacionesResultantes || estacionesResultantes.length === 0) {
    console.log("Bicing Service: NO HAY ESTACIONES HALLADAS PARA ESTA DIRECCIÓN!"); 
  }
  else {
    console.log("Bicing Service: Las estaciones que tienen ese patrón es: " + estacionesResultantes.length); 
    return estacionesResultantes; 
  }
}