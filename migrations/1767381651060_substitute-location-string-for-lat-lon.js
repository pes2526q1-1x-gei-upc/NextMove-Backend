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
  pgm.dropColumn('empresas', 'ubicacion');
  pgm.addColumn('empresas',{
    ubicacion: {
      type: 'geography(Point,4326)',
      notNull: true,
      unique: true
    }
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropColumn('empresas', 'ubicacion');
  pgm.addColumn('empresas', {
    ubicacion: {
      type: 'varchar(200)',
      notNull: true,
      unique: true
    }
  });
};