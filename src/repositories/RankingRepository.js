import pool from '../config/database.js'; 

class RankingRepository {
/**
     * Obtiene el ranking completo de todos los users del sistema
 */

  valid_metrics = ['num_rutas',  'km_recorridos', 'elevacion_positiva', 'co2_ahorrado', 'calorias_quemadas', 'num_retos_participados', 'num_retos_completados', 'puntos_totales']; 


  //Método para validar la metrica que recibimos desde el service. 
  async isValidMetric(metric) {
    console.log(`REPO RANKING: métrica recibida ${metric}`); 
    if (this.valid_metrics.includes(metric)) {
      console.log(' es válida!'); 
      return  true; 
    }
    else {
      console.log(' no es válida!'); 
      return false; 
    }
  }

  //Método que obtiene el ranking global del sistema
  async  getFullRanking(metric) {
    try {
      if (!this.isValidMetric(metric)) {
        throw new Error(`Ranking Repo: Métrica inválida ${metric}`);
      }
      const result = await pool.query(
        `SELECT u.nickname,
                urs.email, 
                urs.num_rutas, 
                urs.km_recorridos,
                urs.elevacion_positiva, 
                urs.co2_ahorrado, 
                urs.calorias_quemadas, 
                urs.num_retos_completados, 
                urs.num_retos_participados, 
                urs.num_retos_completados,
                urs.puntos_totales,  
                ROW_NUMBER() OVER (ORDER BY ${metric} DESC) AS posicion
            FROM user_ranking_stats urs INNER JOIN users u ON urs.email = u.email
            WHERE(urs.num_rutas >= 0)
            ORDER BY ${metric} DESC
        `); 
      console.log("REPO RANKING: Ranking completo obtenido correctamente") ; 
      return result.rows; 
    } catch (error) {
      console.error('RankingRepository: Error obtenido al intentar obtener el Ranking de forma completa');
      throw error;  
    }
  }

  //Método para obtener las stats de un user determinado
  async getUserStats(email) {
    try {
      const result = await pool.query(`
            SELECT urs.email,
                   urs.num_rutas,
                   urs.km_recorridos, 
                   urs.elevacion_positiva, 
                   urs.co2_ahorrado,
                   urs.calorias_quemadas, 
                   urs.num_retos_participados,
                   urs.num_retos_completados,
                   urs.puntos_totales,
                   u.name AS nombre,
                   u.nickname AS nombre_usuario,
                   u.photo AS foto,
                   u.birth_date AS fecha_nacimiento,
                   u.phone_number AS numero_telefono,
                   u.preferred_mode AS modo_preferido,
                   u.preferred_language AS idioma_preferido,
                   u.bio_description AS descripcion_biografica,
                   u.created_at AS fecha_creacion,
                   u.reg_with_google AS registrado_con_google
            FROM user_ranking_stats urs
            LEFT JOIN users u ON urs.email = u.email
            WHERE urs.email = $1`, [email]); 
      //verificamos que realmente ese user es existente en el ranking
      if (!result.rows[0]) {
        console.warn(`RankingRepository: Usuario ${email} no existe en el sistema de Ranking!`); 
        return null; 
      }
      else {
        console.log(`RankingRepository: Usuario ${email} existe en el sistema de Ranking!`); 
        return result.rows[0]; 
      }
    } catch (error) {
      console.error('RankingRepository: Error desconocido al obtener las estadísticas del user'); 
      throw error; 
    }
  }

  //Método para obtener todas las estadísticas globales del sistema de ranking: 
  async getGlobalStats() {
    try {
      const result = await pool.query(`
        SELECT
            COUNT(*) AS total_usuarios,
            COUNT(*) FILTER (WHERE num_rutas > 0) AS usuarios_activos,
            COUNT(*) FILTER (WHERE num_rutas = 0) AS usuarios_inactivos, 
            SUM(num_rutas) AS rutas_totales,
            SUM(km_recorridos) AS km_recorridos_totales,
            ROUND(AVG(km_recorridos)::numeric, 2) as km_promedio,
            MAX(km_recorridos) AS km_recorridos_maximo,
            SUM(elevacion_positiva) AS elevacion_positiva_total,
            SUM(co2_ahorrado) AS co2_total_ahorrado,
            SUM(calorias_quemadas) AS calorias_quemadas_total, 
            SUM(num_retos_participados) AS num_retos_participados_total,
            SUM(num_retos_completados) AS num_retos_completados_total
        FROM user_ranking_stats
        `); 
      return result.rows[0]; 
    } catch (error) {
      console.error('RecorridoRepository: Error desconocido al obtener todas las stats globales del sistema.'); 
      throw error; 
    }
  }
}

export default RankingRepository; 