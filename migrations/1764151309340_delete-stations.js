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
  pgm.dropTable('stations', { cascade: true });
};

export const down = (pgm) => {
  pgm.createTable('stations', {
    id: { type: 'varchar(20)', primaryKey: true },
    nombre: { type: 'varchar(20)', notNull: true },
    direccion: { type: 'varchar(50)', notNull: true },
    totales: { type: 'integer', notNull: true },
    coordenadas: { type: 'geography(POINT,4326)' }
  });
  
  pgm.addConstraint('stations', 'stations_totales_positive', 'CHECK (totales > 0)');
};