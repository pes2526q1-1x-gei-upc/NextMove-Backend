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
  pgm.addConstraint('estacionbicing', 'fk_estacion_bicing_to_estacion', {
    foreignKeys: {
      columns: 'id',
      references: 'stations(id)', 
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    }
  }); 
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropConstraint('estacionbicing', 'fk_estacion_to_stations'); 
};
