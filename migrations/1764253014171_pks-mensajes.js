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
  pgm.dropConstraint('mensaje', 'mensaje_user_id_fkey');
  pgm.dropConstraint('mensaje', 'mensaje_chat_id_fkey');
    
  pgm.alterColumn('mensaje', 'sentTime', {
    type: 'timestamp',
    notNull: true,
    default: pgm.func('current_timestamp')
  });
  
  pgm.addConstraint('mensaje', 'mensaje_pkey', {
    primaryKey: ['user_email', 'chat_id', 'sentTime']
  });
  
  pgm.addConstraint('mensaje', 'mensaje_user_email_fkey', {
    foreignKeys: {
      columns: 'user_email',
      references: '"users"(email)',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    }
  });
  pgm.addConstraint('mensaje', 'mensaje_chat_id_fkey', {
    foreignKeys: {
      columns: 'chat_id',
      references: '"chat"(id)',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    }
  });
};

export const down = (pgm) => {
  pgm.dropConstraint('mensaje', 'mensaje_user_email_fkey');
  pgm.dropConstraint('mensaje', 'mensaje_chat_id_fkey');
  pgm.dropConstraint('mensaje', 'mensaje_pkey');
  
  pgm.alterColumn('mensaje', 'sentTime', {
    type: 'timestamp',
    notNull: false,
    default: null
  });
  
  pgm.addConstraint('mensaje', 'mensaje_pkey', {
    primaryKey: ['user_email', 'chat_id']
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