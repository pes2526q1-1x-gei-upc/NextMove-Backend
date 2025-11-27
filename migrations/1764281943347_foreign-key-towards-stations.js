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
  pgm.addConstraint('favstation', 'fk_favstation_station_id', {
    foreignKeys: {
      columns: 'station_id',
      references: 'stations(id)',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
  });
  pgm.addConstraint('valoracion', 'fk_valoracion_station_id', {
    foreignKeys: {
      columns: 'station_id',
      references: 'stations(id)',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropConstraint('favstation', 'fk_favstation_station_id');
  pgm.dropConstraint('valoracion', 'fk_valoracion_station_id');
};
