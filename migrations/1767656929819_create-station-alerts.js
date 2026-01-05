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
  pgm.createTable('station_alerts', {
    id: { type: 'serial', primaryKey: true },
    user_email: { type: 'varchar(150)', notNull: true },
    station_id: { type: 'varchar(20)', notNull: true },
    horas: { type: 'text[]', notNull: true }, // Array de horas en formato 'HH:MM'
    dias_semana: { type: 'integer[]', notNull: true }, // Array de días: 0=Lunes, 6=Domingo
    activa: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
  });

  pgm.addConstraint('station_alerts', 'station_alerts_user_email_fkey', {
    foreignKeys: {
      columns: 'user_email',
      references: '"users"(email)',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    }
  });

  pgm.addConstraint('station_alerts', 'station_alerts_station_id_fkey', {
    foreignKeys: {
      columns: 'station_id',
      references: '"estacionbicing"(id)',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    }
  });

  // Índice para búsquedas por usuario
  pgm.createIndex('station_alerts', 'user_email', {
    name: 'idx_station_alerts_user_email'
  });

  // Índice para búsquedas por estación
  pgm.createIndex('station_alerts', 'station_id', {
    name: 'idx_station_alerts_station_id'
  });
};

export const down = (pgm) => {
  pgm.dropTable('station_alerts', { cascade: true });
};

