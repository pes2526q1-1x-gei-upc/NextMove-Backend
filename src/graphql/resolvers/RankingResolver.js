import RankingService from '../../services/RankingService.js'; 

const rankingService = new  RankingService();  


export const rankingResolver = {
  Query: { 
    ranking: async (_, { metric }, context) => {
      try {
        console.log("La métrica reciibida en el RESOLVER es " + metric); 
        if (!context || !context.user) {
          throw new Error('No estás autenticado en el sistema!'); 
        }
        const fullRanking = await rankingService.getRankingOrdenado(metric); 
       
        if (!fullRanking || fullRanking.length === 0) {
          console.log('RankingResolver: No hay usuarios en el ranking'); 
          return []; 
        }
        console.log("RankingResolver: El ranking ordenado ha sido obtenido correctamente!"); 
        return fullRanking; 
      } catch (error) {
        console.error("RankingResolver: Error obtenido ranking: ", error.message); 
        throw new Error(error.message || "Error al obtener el ranking"); 
      }
    },

    userStats: async (_, { email }, context) => {
      if (!context || !context.user) {
        throw new Error('No estás autenticado en el sistema!'); 
      } 

      if (!email) {
        throw new Error("RankingResolver: El email es requerido!"); 
      }

      const userStats = await rankingService.getUserStats(email); 
      if (!userStats) {
        throw new Error(`RankingResolver: El usuario ${email} no existe en el ranking`); 
      }

      console.log(`RankingResolver: Se ha obtenido correctamente las estadísticas del user ${email}`);
      return userStats; 
    }, 

    globalStats: async (_, context) => {
      if (!context || !context.user) {
        throw new Error('No estás autenticado en el sistema!'); 
      } 

      const globalRanking = await rankingService.getRankingGlobal(); 
      
      if (!globalRanking || globalRanking.length === 0) {
        throw new Error("RankingResolver: Error obtenido al intentar obtener el ranking global, no hay usuarios!"); 
      }
      
      return globalRanking; 
    }, 

    topUsers: async (_, { limit, metric }, context) => {
      if (!context || !context.user) {
        throw new Error('No estás autenticado en el sistema!'); 
      } 

      console.log("LA METRICCA Y LIMITE SON: " + metric + " " + limit); 
      if (limit <= 0) {
        throw new Error("RankingResolver: El valor del límite debe ser un número mayor estricto que 0!!!"); 
      }

      const limitedRanking = await rankingService.getTopUsuarios(limit, metric); 
      console.log(`RankingResolver: El ranking parcial se ha obtenido con éxito!`); 
      return limitedRanking;
    }
  }
}; 

export default rankingResolver;