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
  pgm.createTable('stations', {
    id: { type: 'varchar(50)', primaryKey: true },
  });
};

export const down = (pgm) => {
  pgm.dropTable('stations');
};