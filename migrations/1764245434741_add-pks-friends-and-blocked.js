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
  // Añadir primary key compuesta a la tabla amigos
  pgm.addConstraint('amigos', 'amigos_pkey', {
    primaryKey: ['nickname1', 'nickname2']
  });

  // Añadir primary key compuesta a la tabla bloqueados
  pgm.addConstraint('bloqueados', 'bloqueados_pkey', {
    primaryKey: ['nickname1', 'nickname2']
  });
};

export const down = (pgm) => {
  pgm.dropConstraint('bloqueados', 'bloqueados_pkey');
  pgm.dropConstraint('amigos', 'amigos_pkey');
};