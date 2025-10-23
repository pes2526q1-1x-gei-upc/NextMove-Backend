//Resolver de EstacionDeBicing

//Importamos el worker que mantiene la caché de estaciones de bicing. 
import EstacionDeBicingSyncWorker from "../../workers/EstacionDeBicingSyncWorker.js";

export const estacionDeBicingResolver = {
    Query: {
        //método para obtener todas las estaciones de bicing fusionadas.
        getEstacionesDeBicing: async () => {
            return await EstacionDeBicingSyncWorker.getEstacionesCache();
        },
        //método para obtener una estación de bicing por su IDSS
        getEstacionDeBicing: async (_, {id}) => { 
            const estaciones = EstacionDeBicingSyncWorker.getEstacionesCache();
            const estacionEncontrada = estaciones.find(estacion => estacion.id == id); 
            //verificamos que la estación existe antes de ser retornada. 
            if(!estacionEncontrada || estacionEncontrada == null) {
                console.log("NO EXISTE LA ESTACIÓN CON ID: " + id);
                return null; 
            }
            else {
                console.log("RESOLVER BICING: Estación encontrada con ID: " + id);
                return estacionEncontrada;
            }
        }
    }
}; 