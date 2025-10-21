//Importamos el servicio que hemos creado que es el que tiene la lógica para obtener los datos de la estación
import * as fakeStationService from "../../services/fakeStationService.js";

export const estacionDeBiciResolver = {
    Query: {
        estacionesDeBici: async () => {
            return await fakeStationService.getFakeStations();
        },
        estacionDeBici: async (_, {id }) => {
            return await fakeStationService.getFakeStation(id);
        }
    }
}