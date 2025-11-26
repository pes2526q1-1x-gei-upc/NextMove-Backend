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
    pgm.dropConstraint('favstation', 'favstation_pkey',{ ifExists: true });
    pgm.renameColumn('favstation', 'user_id', 'email', { ifExists: true });
    pgm.addConstraint('favstation', 'favstation_email_fkey', {
    foreignKeys: {
      columns: 'email',
      references: '"users"(email)',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    }
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    pgm.dropConstraint('favstation', 'favstation_email_fkey',{ ifExists: true });
    pgm.renameColumn('favstation', 'email', 'user_id', { ifExists: true });
    pgm.addConstraint('favstation', 'favstation_user_id_fkey', {
    foreignKeys: {
      columns: 'user_id',
      references: '"users"(id)'
    }
  });
};
