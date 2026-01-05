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
  pgm.createTable('user_fcm_tokens', {
    id: { type: 'serial', primaryKey: true },
    user_email: { type: 'varchar(150)', notNull: true },
    fcm_token: { type: 'text', notNull: true },
    device_id: { type: 'varchar(255)' }, // Opcional: identificador único del dispositivo
    platform: { type: 'varchar(20)' }, // 'ios', 'android', 'web'
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
  });

  pgm.addConstraint('user_fcm_tokens', 'user_fcm_tokens_user_email_fkey', {
    foreignKeys: {
      columns: 'user_email',
      references: '"users"(email)',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    }
  });

  // Índice único para evitar tokens duplicados
  pgm.addConstraint('user_fcm_tokens', 'user_fcm_tokens_fcm_token_unique', {
    unique: ['fcm_token']
  });

  // Índice para búsquedas por usuario
  pgm.createIndex('user_fcm_tokens', 'user_email', {
    name: 'idx_user_fcm_tokens_user_email'
  });

  // Índice para búsquedas por token
  pgm.createIndex('user_fcm_tokens', 'fcm_token', {
    name: 'idx_user_fcm_tokens_fcm_token'
  });
};

export const down = (pgm) => {
  pgm.dropTable('user_fcm_tokens', { cascade: true });
};

