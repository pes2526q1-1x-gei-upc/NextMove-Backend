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
  pgm.createTable('empresas', {
    id: {
      type: 'serial',
      primaryKey: true,
    },
    nombre: {
      type: 'varchar(100)',
      notNull: true,
    },
    email: {
      type: 'varchar(100)',
      notNull: true,
      unique: true,
    },
    url: {
      type: 'varchar(100)',
      notNull: true,
      unique: true,
    }});
  pgm.addColumn('retos',{
    empresa_id: {
      type: 'integer',
      default: null,
    },
  });
  pgm.addConstraint('retos', 'retos_empresa_id_fkey', {
    foreignKeys: {
      columns: 'empresa_id',
      references: 'empresas(id)',
      onDelete: 'SET NULL',
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
  pgm.dropConstraint('retos', 'retos_empresa_id_fkey');
  pgm.dropColumn('retos', 'empresa_id');
  pgm.dropTable('empresas');

};
