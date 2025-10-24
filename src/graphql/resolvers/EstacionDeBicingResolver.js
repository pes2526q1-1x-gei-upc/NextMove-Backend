//Resolver de EstacionDeBicing
//Importamos el worker que mantiene la caché de estaciones de bicing. 
//
import * as EstacionBicingService from "../../services/EstacionBicingService.js";

export const estacionDeBicingResolver = {
    Query: {
        //método para obtener todas las estaciones de bicing fusionadas.
        getEstacionesDeBicing: async () => {
            return EstacionBicingService.getEstacionesCache(); 
        },
        //método para obtener una estación de bicing por su IDSS
        getEstacionDeBicing: async (_, {id}) => { 
            return EstacionBicingService.getEstacionFusionada(id); 
        }, 
        getEstacionesDeBicingCercanas: async (_, {location}) => { 
            return EstacionBicingService.getEstacionesBicingCercanas(location); 
        }
    }
}; 