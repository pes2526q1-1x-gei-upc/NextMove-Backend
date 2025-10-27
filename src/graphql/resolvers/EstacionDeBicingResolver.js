//Resolver de EstacionDeBicing
//Importamos el servicio que hemos creado que es el que tiene la lógica para obtener los datos de la estación
import * as EstacionBicingService from "../../services/EstacionBicingService.js";

export const estacionDeBicingResolver = {
    Query: {
        //método para obtener todas las estaciones de bicing fusionadas.
        getEstacionesDeBicing: async () => {
            return await EstacionBicinigService.getEstacionesFusionadas();
        },
        //método para obtener una estación de bicing por su IDSS
        getEstacionDeBicing: async (_, {id}) => { 
            return  EstacionBicinigService.getEstacionFusionada(id); 
        },

        getEstacionesDeBicingCercanas: async (_, { location }) => { 
            console.log(location)
            const {coordinates, radiusKm = 5} = location;
            
            console.log("valor de coods: ", coordinates);
            const {latitude, longitude} = coordinates;
            return EstacionBicingService.getEstacionesDeBicingCercanas(latitude, longitude, radiusKm); 
        }
    }
}; 