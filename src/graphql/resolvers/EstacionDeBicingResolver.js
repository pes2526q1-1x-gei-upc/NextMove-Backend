//Resolver de EstacionDeBicing
// Importamos el servicio como default para que funcionen los métodos
import { getEstaciones, getEstacionById, getEstacionesBicingCercanas} from "../../services/EstacionBicingService.js";
import EstacionDeBicingRepository from "../../repositories/estacionDeBicingRepository.js";

const repo = new EstacionDeBicingRepository(); 

export const estacionDeBicingResolver = {
  Query: {
    //método para obtener todas las estaciones de bicing fusionadas.
    getEstacionesDeBicing: async () => {
      const estaciones = getEstaciones();
      if (!estaciones || estaciones.length === 0) {
        throw new Error('No hay estaciones de Bicing disponibles en este momento.');
      }
      return estaciones;
    },
    //método para obtener una estación de bicing por su ID
    getEstacionDeBicing: async (_, {id}) => {   
      const estaciones = getEstaciones();
      if (!estaciones || estaciones.length === 0) {
        throw new Error('No hay estaciones de Bicing disponibles en este momento');
      }
      const resultEstacion = estaciones.find(estacion => estacion.id === id);
      if (!resultEstacion) {
        throw new Error('No existe la estación con ese identificador.');
      }
      return resultEstacion;
    },
    Query: {
    //método para obtener todas las estaciones de bicing fusionadas.
      getEstacionesDeBicing: async () => {
        const estaciones = getEstaciones();
        if (!estaciones || estaciones.length === 0) {
          throw new Error('No hay estaciones de Bicing disponibles en este momento.');
        }
        return estaciones;
      },
      //método para obtener una estación de bicing por su ID
      getEstacionDeBicing: async (_, {id}) => {   
        const estaciones = getEstaciones();
        if (!estaciones || estaciones.length === 0) {
          throw new Error('No hay estaciones de Bicing disponibles en este momento');
        }
        const resultEstacion = estaciones.find(estacion => estacion.id === id);
        if (!resultEstacion) {
          throw new Error('No existe la estación con ese identificador.');
        }
        return resultEstacion;
      },

      //método que obtiene las estaciones que se hallan a un radio radiusKm de distancia respecto la pos del user en ese instante. 
      getEstacionesDeBicingCercanas: async (_, { location }) => {
        console.log(location);
        const { coordinates, radiusKm = 5 } = location;
        console.log("valor de coods: ", coordinates);
        console.log("radio utilizado: ", radiusKm, "km");
        const { latitude, longitude } = coordinates;
        return getEstacionesBicingCercanas({ coordinates: { latitude, longitude } }, radiusKm);
      }
    }, 

    Mutation: {
    //métodos que solo accedemos directamente desde el repo: 
    //Método de dar de alta una estación en el sistema. 
      createEstacionDeBicing: async (_,  { input })  => {
        try {
          const result = await repo.createEstacionDeBicing(input); 
          console.log("Estacion Bicing Resolver: Estación creada correctamente"); 
          return result; 
        } catch (error) {
        //VIOLACIÓN DE CHECK condition: 
          if (error.code === '23514') {
            throw new Error('El valor de plazasTotales no puede ser negativo.'); 
          }  

          //VIOLACIÓN DE NOT NULL VALUES: Falta información en la relación: 
          if (error.code === '23502') {
            throw new Error('Faltan datos para completar la información de la estación de bicing.');  
          }

          //VIOLACIÓN DE TIPO INCORRECTO:
          if (error.code == '22P02') {
            throw new Error('Estás intentando insertar un campo con un tipo de datos que no le corresponde.'); 
          }

          //CASO QUE NO ABARCA NINGUNO DE LOS PREVIOS: 
          throw new Error('Error desconocido al crear estación.'); 
        }
      },
      //Método de actualiza la estaciónn que precisamos: 
      updateEstacionDeBicing: async (_, {id, input}) => {
        try {
        //miramos si hay cambios en primera instancia: 
          const hayCambios = Object.values(input).some(v => v !== undefined); 
          if (!hayCambios) {
            const estacionActual =  getEstacionById(id); 
            if (!estacionActual) {
              throw new Error('La estación que precisas no existe.');  
            }
            else return estacionActual; 
          }
          else {
          //caso de sí haber alguna actualización disponible: 
            const estacionModificada = await repo.updateEstacionDeBicing(id, input); 
            if (!estacionModificada) {
              throw new Error("EstacionDeBicingResolver: Error al intenar modficar la estación."); 
            }
            else return estacionModificada;  
          }

        } catch (error) {
        //VIOLACIÓN DE CHECK condition: 
          if (error.code === '23514') {
            throw new Error('El valor de plazasTotales no puede ser negativo.'); 
          }  

          //VIOLACIÓN DE NOT NULL VALUES: Falta información en la relación: 
          if (error.code === '23502') {
            throw new Error('Faltan datos para completar la información de la estación de bicing.');  
          }

          //VIOLACIÓN DE TIPO INCORRECTO:
          if (error.code == '22P02') {
            throw new Error('Estás intentando insertar un campo con un tipo de datos que no le corresponde.'); 
          }

          //CASO QUE NO ABARCA NINGUNO DE LOS PREVIOS: 
          throw new Error('Error desconocido al actualizar estación.'); 
        }
      }, 
      //Método que suprime la estación que precisamos: 
      deleteEstacionDeBicing: async (_, { id }) => {
        try {
          const deleted = await repo.deleteEstacionBicing(id); 
          if (!deleted) {
            throw new Error("EstacionDeBicingResolver: Error no se ha eliminado la estación precisada del sistema porque no existe."); 
          }
          else return deleted; 
        } catch (error) {
          console.error(error); 
          throw new Error('Error al eliminar la estación ' + error.message); 
        }
      }
    }
  }
};

