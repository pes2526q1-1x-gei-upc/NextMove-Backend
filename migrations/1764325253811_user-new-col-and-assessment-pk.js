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
  pgm.addColumn('users', {
    regWithGoogle: { type: 'boolean', notNull: true }
  });
  pgm.dropConstraint('valoracion', 'valoracion_pkey');
  pgm.addConstraint('valoracion', 'valoracion_pkey', {
    primaryKey: ['nickname', 'station_id']
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropColumn('users', 'regWithGoogle');
  pgm.dropConstraint('valoracion', 'valoracion_pkey');
  pgm.addConstraint('valoracion', 'valoracion_pkey', {
    primaryKey: ['nickname', 'station_id', 'created_at']
  });
};
