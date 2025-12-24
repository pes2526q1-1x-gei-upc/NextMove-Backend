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
  pgm.addColumn('empresas',{
    descripcion: {
      type: 'text',
      default: null,
    }
  });
  pgm.addColumn('retos',{
    photo: {
      type: 'varchar(255)',
      default: null,
    }
  });
  pgm.addConstraint('empresas', 'empresa_name_unique', {
    unique: ['nombre'],
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropColumn('empresas', 'descripcion');
  pgm.dropColumn('retos', 'photo');
  pgm.dropConstraint('empresas', 'empresa_name_unique');
};
