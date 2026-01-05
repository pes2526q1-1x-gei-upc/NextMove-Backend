/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.sql(`DROP VIEW IF EXISTS user_ranking_stats;`); 

  pgm.createView('user_ranking_stats', {replace: false}, 
    `SELECT
          u.email, 
          COUNT(r.id) AS  num_rutas, 
          COALESCE(SUM(r.distancia), 0) / 1000 AS km_recorridos, 
          COALESCE(SUM(r.elevacion_positiva), 0) AS elevacion_positiva, 
          COALESCE(SUM(r.co2), 0) AS co2_ahorrado, 
          COALESCE(SUM(r.kcal), 0) as calorias_quemadas, 
          COALESCE(COUNT(DISTINCT ur.id), 0)::integer AS num_retos_participados,
          COALESCE(COUNT(*) FILTER (WHERE ur.completed = 100), 0)::integer AS num_retos_completados,
          COALESCE(u.points, 0)::integer AS puntos_totales
     FROM "users" u
     LEFT JOIN recorridos r ON u.email = r.user_email
     LEFT JOIN usuario_retos ur ON u.email = ur.email
     GROUP BY u.email, u.points
     ORDER BY puntos_totales DESC NULLS LAST
    `); 
};
  
/**
   * @param pgm {import('node-pg-migrate').MigrationBuilder}
   * @param run {() => void | undefined}
   * @returns {Promise<void> | void}
   */
export const down = (pgm) => {
  pgm.dropView('user_ranking_stats', {cascade: true}); 
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */