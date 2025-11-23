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
  pgm.createTable('users', {
    email: { type: 'varchar(150)', primaryKey: true },
    name: { type: 'varchar(100)', notNull: true },
    nickname: { type: 'varchar(50)', unique: true, notNull: true },
    photo: 'varchar(255)',
    birth_date: 'varchar(50)',
    phone_number: 'varchar(20)',
    preferred_mode: { type: 'preferido', notNull: true },
    preferred_language: 'varchar(20)',
    bio_description: 'text',
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') }
  });

  // Amigos
  pgm.createTable('amigos', {
    nickname1: { type: 'varchar(20)', notNull: true },
    nickname2: { type: 'varchar(20)', notNull: true },
  }, {
    primaryKey: ['nickname1', 'nickname2']
  });

  pgm.addConstraint('amigos', 'amigos_nickname1_fkey', {
    foreignKeys: {
      columns: 'nickname1',
      references: '"users"(nickname)',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    }
  });
  pgm.addConstraint('amigos', 'amigos_nickname2_fkey', {
    foreignKeys: {
      columns: 'nickname2',
      references: '"users"(nickname)',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    }
  });
  pgm.addConstraint('amigos', 'amigos_no_self', 'CHECK (nickname1 <> nickname2)');

  // Bloqueados
  pgm.createTable('bloqueados', {
    nickname1: { type: 'varchar(50)', notNull: true },
    nickname2: { type: 'varchar(50)', notNull: true }
  }, { primaryKey: ['nickname1', 'nickname2'] });
  
  pgm.addConstraint('bloqueados', 'bloqueados_nickname1_fkey', {
    foreignKeys: {
      columns: 'nickname1',
      references: '"users"(nickname)',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    }
  });
  pgm.addConstraint('bloqueados', 'bloqueados_nickname2_fkey', {
    foreignKeys: {
      columns: 'nickname2',
      references: '"users"(nickname)',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    }
  });
  pgm.addConstraint('bloqueados', 'bloqueados_no_self', 'CHECK (nickname1 <> nickname2)');

};

export const down = (pgm) => {
  pgm.dropTable('bloqueados');
  pgm.dropTable('amigos');
  pgm.dropTable('users');
};
