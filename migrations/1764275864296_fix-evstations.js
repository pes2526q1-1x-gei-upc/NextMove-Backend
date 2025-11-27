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

  pgm.alterColumn('ev_stations', 'id', {
    type: 'varchar(50)',
    using: 'id::varchar || \'_CAR\''
  });

  // Insertar todas las ids en la tabla stations
  pgm.sql(`
    INSERT INTO stations (id)
    SELECT id FROM ev_stations
    ON CONFLICT (id) DO NOTHING;
  `);

  // Añadir foreign key hacia stations
  pgm.addConstraint('ev_stations', 'ev_stations_id_fkey', {
    foreignKeys: {
      columns: 'id',
      references: 'stations(id)',
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
  pgm.dropConstraint('ev_stations', 'ev_stations_id_fkey', { ifExists: true });
  
  pgm.sql(`DELETE FROM stations WHERE id LIKE '%_CAR';`);
  
  pgm.alterColumn('ev_stations', 'id', {
    type: 'integer',
    using: 'CAST(SUBSTRING(id FROM 1 FOR POSITION(\'_\' IN id) - 1) AS integer)'
  });
};
