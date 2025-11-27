import RecorridosRepository from '../../repositories/RecorridosRepository.js';

const recorridosRepo = new RecorridosRepository(); 

//TENEMOS QUE PARSEAR LAS COORDENADAS PARA QUE NO HAYAN CONFLICTOS CON EL GRAPHQL, DE MANERA QUE: 

export const recorridosResolver = {

  Query: {
    recorridos: async (_, __, context) => {
      try {
        //verificamos si se trata del user que ejecuta la funcionalidad para garantizar seguridad al sistema: 
        if (!context || !context.user) {
          throw new Error("No estás autenticado, debes inciar sesión!"); 
        }
        const recorridos = await recorridosRepo.getAllRecorridos(); 
        if (recorridos.length === 0) {
          throw new Error("RecorridoResolver: No existen recorridos en tú sistema actualmente!"); 
        }
        recorridos.forEach(r => console.log('origen:', r.origen, ' desitno: ', r.destino));
        return recorridos.filter(r => r.origen && r.destino); 
      } catch (error) {
        throw new Error(error.message || "RecorridoResolver: Error al obtener los recorridos"); 
      }
    },

    recorrido: async (_, {id}, context) => {
      try {
        if (!context || !context.user) {
          throw new Error("RecorridoResolver: No existen recorridos en tú sistema actualmente!"); 
        }
        const recorrido = await recorridosRepo.getRecorridoById(id); 
        if (!recorrido) {
          throw new Error("RecorridoResolver: El recorrido con ese ID no existe en el sistema!"); 
        }
        else return recorrido; 
      } catch (error) {
        throw new Error(error.message || "RecorridoResolver: Error al obtener el recorrido con ese ID!"); 
      } 
    },

    recorridosByUser: async (_, {user_email}, context) => {
      try {
        if (!context || !context.user) {
          throw new Error("No estás autenticado, debes inciar sesión!"); 
        }
        const recorridos = await recorridosRepo.getRecorridosByUser(user_email); 
        if (recorridos.length === 0) {
          throw new Error("RecorridoResolver: El user no ha realizaod ningún recorrido!!!"); 
        }
        else return recorridos; 
      } catch (error) {
        throw new Error(error.message || "RecorridoResolver: Error al obtener los recorridos del user!");
      }
    }
  },

  Mutation: {
    createRecorrido: async (_, { input }, context) => {
      try {
        if (!context || !context.user) {
          throw new Error("No estás autenticado, debes inciar sesión!"); 
        }
        const result = await recorridosRepo.saveRecorrido(input); 
        console.log("RecorridoResolver: Recorrido creado correctamente!"); 
        return result; 
      } catch (error) {
        //VIOLACIÓN FK: 
        if (error.code === '23503') {
          throw new Error('El usuario especificado no existe, por favor revisa el email introducido.'); 
        }
        //VIOLACIÓN CHECK:
        if (error.code === '23514') {
          throw new Error('Los valores de: distancia, CO2 o calorías no pueden ser negativos.');
        }
        //VIOLACIÓN NOT NULL VALUE: Básicamente faltan datos.
        if (error.code === '23502') {
          throw new Error('Faltan datos para completar la información de recorrido.');
        }
        //caso de error desconocido: no se trata ninguno de los previamente mencionado:
        console.error("Error desconocido al crear reocrrido", error); 
        throw new Error("No se puedo registrar el recorrdio. Intétalo de nuevo más tarde.");
      }
    },

    updateRecorrido: async (_, { id, input}, context) => {
      try {
        if (!context || !context.user) {
          throw new Error("No estás autenticado, debes inciar sesión!"); 
        }
        //para evitar hacer consultas innecesarias contra la BD, miramos en primera instancia si existe algún cambio
        const hayCambios = Object.values(input).some(v => v !== undefined); 
        if (!hayCambios) {
          console.log("No se presenta ningún cambio en el recorrido precisado."); 
          const recorrido = await recorridosRepo.getRecorridoById(id); 
          if (!recorrido) {
            throw new Error("RecorridoResolver: El recorrido que quieres modificar no existe."); 
          }
          return recorrido; 
        } 
        else {
          //en este caso sí que hay modificaciones en recorrido
          const recorridoModificado = await recorridosRepo.updateRecorrido(id, input); 
          //miramos que la modificación fue exitosa
          if (!recorridoModificado) {
            throw new Error("RecorridoResolver: Error al intentar actualizar el recorrido."); 
          }
          return recorridoModificado;  
        }  
      } catch (error) {
        if (error.code === '23514') {
          throw new Error('Los valores de: distancia, CO2 o calorías no pueden ser negativos');
        }

        if (error.code === '23502') {
          throw new Error('Estás intentando asignar un valor nulo a un campo que no puede serlo.'); 
        }
                
        if (error.code === '22P02') {
          throw new Error('Estás intentando insertar un tipo de dato en algún campo de forma incorrecta.'); 
        }

        //en el caso que no se den estos errores derivados de bd: 
        throw new Error('No se pudo realizar la modificación del recorrido de forma correcta.'); 
      }
    },

    deleteRecorrido: async (_, { id }, context) => {
      try {
        if (!context || !context.user) {
          throw new Error("No estás autenticado, debes inciar sesión!"); 
        }
        //sabemos que si se elimina rowCount retorna 1, sino 0. 
        const deleted = await recorridosRepo.deleteRecorrido(id); 
        if (!deleted) {
          throw new Error("RecorridoResolver: Error no se ha eliminado el recorrido porque no existe"); 
        }
        else return deleted; 
      } catch (error) {
        if (error.code === '23503') {
          throw new Error('No se puede eliminar el recorrido porqie otros datos dependen de él.'); 
        }
        console.error("Error desconocido al eliminar recorrido.", error); 
        throw new Error("No se puede eliminar el recorrido precisado!"); 
      }
    } 
  }
};