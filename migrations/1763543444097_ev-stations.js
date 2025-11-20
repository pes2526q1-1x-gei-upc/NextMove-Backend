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
  // Tabla principal
  pgm.createTable('ev_stations', {
    id: { type: 'serial', primaryKey: true }, // SERIAL es autoincremental, no pongas también varchar y primaryKey; el tipo correcto sería 'serial'
    name: { type: 'varchar(500)', notNull: true },
    address: { type: 'text' },
    city: { type: 'varchar(255)' },
    coordinates: { type: 'geography(Point,4326)', notNull: true },
    ccs_power_kw: { type: 'decimal(6,2)' },
    chademo_power_kw: { type: 'decimal(6,2)' },
    mennekes_power_kw: { type: 'decimal(6,2)' },
    schuko_power_kw: { type: 'decimal(6,2)' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') },
    last_synced_at: { type: 'timestamp' }
  });

  // Checks para potencias
  pgm.addConstraint('ev_stations', 'ev_stations_ccs_power_kw_positive', 'CHECK (ccs_power_kw IS NULL OR ccs_power_kw > 0)');
  pgm.addConstraint('ev_stations', 'ev_stations_chademo_power_kw_positive', 'CHECK (chademo_power_kw IS NULL OR chademo_power_kw > 0)');
  pgm.addConstraint('ev_stations', 'ev_stations_mennekes_power_kw_positive', 'CHECK (mennekes_power_kw IS NULL OR mennekes_power_kw > 0)');
  pgm.addConstraint('ev_stations', 'ev_stations_schuko_power_kw_positive', 'CHECK (schuko_power_kw IS NULL OR schuko_power_kw > 0)');

  // Índices
  pgm.createIndex('ev_stations', 'coordinates', {
    method: 'gist',
    name: 'idx_ev_stations_coordinates'
  });
  pgm.createIndex('ev_stations', 'city', {
    where: 'city IS NOT NULL',
    name: 'idx_ev_stations_city'
  });
  pgm.createIndex('ev_stations', 'ccs_power_kw', {
    where: 'ccs_power_kw IS NOT NULL',
    name: 'idx_ev_stations_has_ccs'
  });
  pgm.createIndex('ev_stations', 'chademo_power_kw', {
    where: 'chademo_power_kw IS NOT NULL',
    name: 'idx_ev_stations_has_chademo'
  });
  pgm.createIndex('ev_stations', 'mennekes_power_kw', {
    where: 'mennekes_power_kw IS NOT NULL',
    name: 'idx_ev_stations_has_mennekes'
  });
  pgm.createIndex('ev_stations', 'schuko_power_kw', {
    where: 'schuko_power_kw IS NOT NULL',
    name: 'idx_ev_stations_has_schuko'
  });

  // Función y trigger para timestamps
  pgm.sql(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  pgm.sql(`
    CREATE TRIGGER update_ev_stations_updated_at
    BEFORE UPDATE ON ev_stations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  `);
};

export const down = (pgm) => {
  pgm.sql('DROP TRIGGER IF EXISTS update_ev_stations_updated_at ON ev_stations');
  pgm.sql('DROP FUNCTION IF EXISTS update_updated_at_column');
  pgm.dropTable('ev_stations');
};
