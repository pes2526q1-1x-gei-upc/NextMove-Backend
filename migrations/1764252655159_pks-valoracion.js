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
  pgm.dropConstraint('valoracion', 'valoracion_nickname_fkey');
  
  pgm.alterColumn('valoracion', 'nickname', {
    type: 'varchar(100)',
    notNull: true
  });
  
  pgm.addConstraint('valoracion', 'valoracion_pkey', {
    primaryKey: ['nickname', 'station_id', 'created_at']
  });
  
  pgm.addConstraint('valoracion', 'valoracion_nickname_fkey', {
    foreignKeys: {
      columns: 'nickname',
      references: '"users"(nickname)',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    }
  });
};

export const down = (pgm) => {
  pgm.dropConstraint('valoracion', 'valoracion_nickname_fkey');
  pgm.dropConstraint('valoracion', 'valoracion_pkey');
  
  pgm.alterColumn('valoracion', 'nickname', {
    type: 'varchar(100)',
    notNull: false
  });
  
  pgm.addConstraint('valoracion', 'valoracion_pkey', {
    primaryKey: ['nickname', 'station_id', 'created_at']
  });
  
  pgm.addConstraint('valoracion', 'valoracion_nickname_fkey', {
    foreignKeys: {
      columns: 'nickname',
      references: '"users"(nickname)',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    }
  });
};