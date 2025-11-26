export const shorthands = undefined;

export const up = (pgm) => {
  // Elimino tabla porque estamos en desarrollo
  pgm.dropTable('ev_stations', { ifExists: true, cascade: true });

  pgm.createExtension('postgis', { ifNotExists: true });

  pgm.createTable('ev_stations', {
    id: {
      type: 'integer',
      primaryKey: true,
      notNull: true
    },
    external_id: {
      type: 'varchar(255)',
      notNull: true
    },
    name: {
      type: 'varchar(500)',
      notNull: true
    },
    address: {
      type: 'text',
      notNull: false
    },
    city: {
      type: 'varchar(255)',
      notNull: false
    },
    coordinates: {
      type: 'geography(Point, 4326)',
      notNull: true
    },
    ccs_power_kw: {
      type: 'decimal(6,2)',
      notNull: false
    },
    chademo_power_kw: {
      type: 'decimal(6,2)',
      notNull: false
    },
    mennekes_power_kw: {
      type: 'decimal(6,2)',
      notNull: false
    },
    schuko_power_kw: {
      type: 'decimal(6,2)',
      notNull: false
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    },
    last_synced_at: {
      type: 'timestamp',
      notNull: false
    }
  });

  // Índices para búsquedas
  pgm.createIndex('ev_stations', 'external_id', {
    name: 'idx_ev_stations_external_id'
  });

  pgm.createIndex('ev_stations', 'coordinates', {
    method: 'gist',
    name: 'idx_ev_stations_coordinates'
  });

  pgm.createIndex('ev_stations', 'city', {
    name: 'idx_ev_stations_city',
    where: 'city IS NOT NULL'
  });

  pgm.createIndex('ev_stations', 'ccs_power_kw', {
    name: 'idx_ev_stations_has_ccs',
    where: 'ccs_power_kw IS NOT NULL'
  });

  pgm.createIndex('ev_stations', 'chademo_power_kw', {
    name: 'idx_ev_stations_has_chademo',
    where: 'chademo_power_kw IS NOT NULL'
  });

  pgm.createIndex('ev_stations', 'mennekes_power_kw', {
    name: 'idx_ev_stations_has_mennekes',
    where: 'mennekes_power_kw IS NOT NULL'
  });

  pgm.createIndex('ev_stations', 'schuko_power_kw', {
    name: 'idx_ev_stations_has_schuko',
    where: 'schuko_power_kw IS NOT NULL'
  });

  // Triggers de metadata
  pgm.createFunction(
    'update_updated_at_column',
    [],
    {
      returns: 'trigger',
      language: 'plpgsql',
      replace: true
    },
    `
    BEGIN
      NEW.updated_at = current_timestamp;
      RETURN NEW;
    END;
    `
  );

  pgm.createTrigger('ev_stations', 'update_ev_stations_updated_at', {
    when: 'BEFORE',
    operation: 'UPDATE',
    function: 'update_updated_at_column',
    level: 'ROW'
  });
};

export const down = (pgm) => {
  pgm.dropTrigger('ev_stations', 'update_ev_stations_updated_at', { ifExists: true });
  pgm.dropFunction('update_updated_at_column', [], { ifExists: true, cascade: true });
  pgm.dropTable('ev_stations', { ifExists: true, cascade: true });
};