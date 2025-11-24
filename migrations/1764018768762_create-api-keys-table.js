// migrations/XXXX_create_api_keys_table.js

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
  pgm.createTable('api_keys', {
    id: 'id',
    company_name: {
      type: 'varchar(255)',
      notNull: true
    },
    key_hash: {
      type: 'varchar(255)',
      notNull: true,
      unique: true
    },
    rate_limit_per_hour: {
      type: 'integer',
      notNull: true,
      default: 1000
    },
    total_requests: {
      type: 'integer',
      notNull: true,
      default: 0
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    },
    last_used_at: {
      type: 'timestamp'
    }
  });

  pgm.createIndex('api_keys', 'key_hash');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable('api_keys');
};