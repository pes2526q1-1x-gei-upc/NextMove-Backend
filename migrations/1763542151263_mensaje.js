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
  pgm.createTable('mensaje', {
    user_email: { type: 'varchar(100)', notNull: true },
    cuerpo: { type: 'varchar(200)' },
    chat_id: { type: 'varchar(100)', notNull: true },
    imagen: { type: 'varchar(200)' },
    sentTime: { type: 'timestamp' }
  }, {
    primaryKey: ['user_id', 'chat_id']
  });
  pgm.addConstraint('mensaje', 'mensaje_user_id_fkey', {
    foreignKeys: {
      columns: 'user_email',
      references: '"users"(email)'
    }
  });
  pgm.addConstraint('mensaje', 'mensaje_chat_id_fkey', {
    foreignKeys: {
      columns: 'chat_id',
      references: '"chat"(id)'
    }
  });
};

export const down = (pgm) => {
  pgm.dropTable('mensaje');
};
