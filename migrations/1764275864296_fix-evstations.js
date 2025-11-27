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
  // 1. Eliminar tabla vieja completamente
  pgm.dropTable('ev_stations', { ifExists: true, cascade: true });

  // 2. Crear tabla nueva con id como varchar desde el principio
  pgm.createTable('ev_stations', {
    id: {
      type: 'varchar(50)',
      primaryKey: true,
      notNull: true,
      references: 'stations',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
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

  // 3. Crear índices
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

  // 4. Crear trigger para updated_at
  pgm.createTrigger('ev_stations', 'update_ev_stations_updated_at', {
    when: 'BEFORE',
    operation: 'UPDATE',
    function: 'update_updated_at_column',
    level: 'ROW'
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable('ev_stations', { ifExists: true, cascade: true });
};
