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
  pgm.createTable('search_history', {
    email: { type: 'varchar(150)', notNull: true },
    texto: { type: 'varchar(255)', notNull: true },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp'), notNull: true }
  });

  pgm.addConstraint('search_history', 'search_history_pkey', {
    primaryKey: ['email', 'created_at']
  });
  
  pgm.addConstraint('search_history', 'search_history_email_fkey', {
    foreignKeys: {
      columns: 'email',
      references: '"users"(email)',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    }
  });

  pgm.createIndex('search_history', ['email', 'created_at'], { method: 'btree' });

  // Función que elimina búsquedas antiguas si hay más de 5
  pgm.createFunction(
    'limit_search_history',
    [],
    {
      returns: 'trigger',
      language: 'plpgsql',
      replace: true
    },
    `
    BEGIN
      DELETE FROM search_history
      WHERE email = NEW.email
      AND created_at NOT IN (
        SELECT created_at
        FROM search_history
        WHERE email = NEW.email
        ORDER BY created_at DESC
        LIMIT 5
      );
      RETURN NEW;
    END;
    `
  );

  // Trigger que ejecuta la función después de cada INSERT
  pgm.createTrigger('search_history', 'limit_search_history_trigger', {
    when: 'AFTER',
    operation: 'INSERT',
    function: 'limit_search_history',
    level: 'ROW'
  });
};

export const down = (pgm) => {
  pgm.dropTrigger('search_history', 'limit_search_history_trigger');
  pgm.dropFunction('limit_search_history', []);
  pgm.dropTable('search_history');
};