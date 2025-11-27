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
  // Añadir la primary key compuesta
  pgm.dropConstraint('favstation', 'favstation_pkey');
  pgm.addConstraint('favstation', 'favstation_pkey', {
    primaryKey: ['email', 'station_id']
  });
};

export const down = (pgm) => {
  pgm.dropConstraint('favstation', 'favstation_pkey');
};