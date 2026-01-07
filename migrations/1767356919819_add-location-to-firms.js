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
  pgm.addColumn('empresas', {
    ubicacion: {
      type: 'varchar(200)',
      notNull: true,
      unique: true
    }
  });
  pgm.dropColumn('empresas', 'usuario_id');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropColumn('empresas', 'ubicacion');
  pgm.addColumns('empresas', {
    usuario_id: {
      type: 'integer',
      unique: true,          
      notNull: false,        
      references: '"auth_user"', 
      onDelete: 'CASCADE',   
    },
  });
  pgm.createIndex('empresas', 'usuario_id');
};
