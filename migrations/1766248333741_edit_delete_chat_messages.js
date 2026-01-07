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
  pgm.addColumns('chat_messages', {
    deleted: {
      type: 'boolean',
      notNull: true,
      default: false
    },
    deleted_at: {
      type: 'timestamp'
    },
    edited: {
      type: 'boolean',
      notNull: true,
      default: false
    },
    edited_at: {
      type: 'timestamp'
    }
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropColumns('chat_messages', ['deleted', 'deleted_at', 'edited', 'edited_at']);
};