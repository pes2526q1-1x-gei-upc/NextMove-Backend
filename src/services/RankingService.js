import RankingRepository from "../repositories/RankingRepository.js";


export default class  RankingService {
  constructor() {
    this.rankingRepo = new RankingRepository(); 
  }
  //Método que obtiene el ranking ordenado por métrica concreta (sistema de filtraje)
  async getRankingOrdenado(metrica) {
    try {
      const ranking = await this.rankingRepo.getFullRanking(metrica); 
      if (!ranking) {
        throw new Error('RankingService: El ranking está vacío errror!'); 
      }
      return ranking; 
    } catch (error) {
      console.error('RankingService: Error desconocido al obtener el ranking completo'); 
      throw error; 
    }
  } 
  
  async getUserStats(email) {
    try {
      const user_stats = await this.rankingRepo.getUserStats(email); 
      return user_stats; 
    } catch (error) {
      console.error('RankingService: Error obteniendo stats del user concreto');
      throw error; 
    }
  }

  async getRankingGlobal() {
    try {
      const global_ranking = await this.rankingRepo.getGlobalStats(); 
      if (!global_ranking) {
        throw new Error('RankingService: Error al obtener el ranking global, está vació!'); 
      } 
      return global_ranking; 
    } catch (error) {
      console.error('RankingService: Error desconocido al obtener el Ranking!');
      throw error;  
    }
  }

  async getTopUsuarios(limit, metrica) {
    try {
      if (limit <= 0) {
        throw new Error('RankingService: El límite no puede ser negativo o igual 0!'); 
      }
      
      //obtenemos el ranking para hacer slice de éste posteriomente
      const ranking = await this.rankingRepo.getFullRanking(metrica); 
      if (!ranking || ranking.length === 0) {
        console.log('RankingService: El ranking tiene tamaño 0 o está vacío'); 
        return []; 
      }
      const limitedRanking = ranking.slice(0, limit); 
      return limitedRanking; 

    } catch (error) {
      console.error('RankingService: Error desconocido al obtener el ranking limitado por users!'); 
      throw error; 
    }
  }
}