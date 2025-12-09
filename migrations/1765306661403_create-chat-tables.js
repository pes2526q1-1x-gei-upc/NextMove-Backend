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
  // Tabla de chats
  pgm.createTable('chats', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()')
    },
    type: {
      type: 'varchar(20)',
      notNull: true,
      check: "type IN ('direct', 'group')"
    },
    description: {
      type: 'text',
      notNull: false
    },
    name: {
      type: 'varchar(255)',
      notNull: false
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('NOW()')
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('NOW()')
    }
  });

  // Tabla de participantes
  pgm.createTable('chat_participants', {
    chat_id: {
      type: 'uuid',
      notNull: true,
      references: 'chats(id)',
      onDelete: 'CASCADE'
    },
    user_email: {
      type: 'varchar(150)',
      notNull: true,
      references: 'users(email)',
      onDelete: 'CASCADE'
    },
    joined_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('NOW()')
    }
  });

  pgm.addConstraint('chat_participants', 'chat_participants_pkey', {
    primaryKey: ['chat_id', 'user_email']
  });

  // Tabla de mensajes
  pgm.createTable('chat_messages', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()')
    },
    chat_id: {
      type: 'uuid',
      notNull: true,
      references: 'chats(id)',
      onDelete: 'CASCADE'
    },
    sender_email: {
      type: 'varchar(150)',
      notNull: true,
      references: 'users(email)',
      onDelete: 'CASCADE'
    },
    content: {
      type: 'text',
      notNull: true
    },
    type: {
      type: 'varchar(20)',
      notNull: true,
      default: "'text'"
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('NOW()')
    }
  });

  
  pgm.createIndex('chat_messages', ['chat_id', 'created_at'], {
    name: 'idx_chat_messages_chat_time',
    method: 'btree'
  });

  pgm.createIndex('chat_participants', 'user_email', {
    name: 'idx_chat_participants_user'
  });

  pgm.createIndex('chats', 'updated_at', {
    name: 'idx_chats_updated'
  });

  // Trigger para actualizar updated_at automáticamente
  pgm.createFunction(
    'update_chat_timestamp',
    [],
    {
      returns: 'TRIGGER',
      language: 'plpgsql',
      replace: true
    },
    `
    BEGIN
      UPDATE chats SET updated_at = NOW() WHERE id = NEW.chat_id;
      RETURN NEW;
    END;
    `
  );

  pgm.createTrigger('chat_messages', 'trigger_update_chat_timestamp', {
    when: 'AFTER',
    operation: 'INSERT',
    function: 'update_chat_timestamp',
    level: 'ROW'
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTrigger('chat_messages', 'trigger_update_chat_timestamp');
  pgm.dropFunction('update_chat_timestamp', [], { ifExists: true });
  pgm.dropIndex('chats', 'updated_at', { name: 'idx_chats_updated' });
  pgm.dropIndex('chat_participants', 'user_email', { name: 'idx_chat_participants_user' });
  pgm.dropIndex('chat_messages', ['chat_id', 'created_at'], { name: 'idx_chat_messages_chat_time' });
  pgm.dropTable('chat_messages');
  pgm.dropTable('chat_participants');
  pgm.dropTable('chats');
};