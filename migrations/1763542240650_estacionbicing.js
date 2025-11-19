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
  pgm.createTable('estacionbicing', {
    id: { type: 'varchar(50)', primaryKey: true },
    nombre: { type: 'varchar(255)', notNull: true },
    direccion: { type: 'varchar(255)', notNull: true },
    plazasTotales: { type: 'integer', notNull: true },
    coordenadas: { type: 'point', notNull: true },
    estacionCargaElectrica: { type: 'boolean', notNull: true }
  });

  pgm.addConstraint('estacionbicing', 'estacionbicing_plazasTotales_check', 'CHECK (plazasTotales >= 0)');
};

export const down = (pgm) => {
  pgm.dropTable('estacionbicing');
};
