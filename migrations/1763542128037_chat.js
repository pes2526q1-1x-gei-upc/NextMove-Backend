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
  pgm.createTable('chat', {
    id: { type: 'varchar(100)', primaryKey: true },
    nombre: { type: 'varchar(20)', notNull: true },
    descripcion: { type: 'varchar(200)' },
    createdTime: { type: 'timestamp' }
  });
};

export const down = (pgm) => {
  pgm.dropTable('chat');
};
