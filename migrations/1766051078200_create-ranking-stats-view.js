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
//Creamos la vista de ranking (dinámica) que agrega estadísticas por user: 
  pgm.createView('user_ranking_stats', {replace: false}, 
    `SELECT
        u.email, 
        COUNT(r.id) AS  num_rutas, 
        COALESCE(SUM(r.distancia), 0) / 1000 AS km_recorridos, 
        COALESCE(SUM(r.elevacion_positiva), 0) AS elevacion_positiva, 
        COALESCE(SUM(r.co2), 0) AS co2_ahorrado, 
        COALESCE(SUM(r.kcal), 0) as calorias_quemadas
    FROM "users" u
    LEFT JOIN recorridos r ON u.email = r.user_email
    GROUP BY u.email
    ORDER BY km_recorridos DESC NULLS LAST
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
