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
  pgm.createTable('estation', {
    id: { type: 'varchar(20)', primaryKey: true },
    potencia: { type: 'integer', notNull: true },
    tipoConexion: { type: 'tipoConexion', notNull: true },
    tipoCoche: { type: 'tipoCoche', notNull: true },
    tipoCorriente: { type: 'tipoCorriente', notNull: true },
    tipoVelocidad: { type: 'tipoVelocidad', notNull: true }
  });
};

export const down = (pgm) => {
  pgm.dropTable('estation');
};

