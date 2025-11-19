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
  pgm.createTable('stations', {
    id: { type: 'varchar(20)', primaryKey: true },
    nombre: { type: 'varchar(20)', notNull: true },
    direccion: { type: 'varchar(50)', notNull: true },
    totales: { type: 'integer', notNull: true },
    coordenadas: { type: 'geography(POINT,4326)' }
  });
  pgm.addConstraint('stations', 'stations_totales_positive', 'CHECK (totales > 0)');

  // Ejemplo de otra tabla relacionada:
  pgm.createTable('valoracion', {
    nickname: { type: 'varchar(100)' },
    station_id: { type: 'varchar(20)', notNull: true },
    score: { type: 'integer', notNull: true },
    description: { type: 'varchar(200)' },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp'), notNull: true }
  }, {
    primaryKey: ['nickname', 'station_id', 'created_at']
  });

  pgm.addConstraint('valoracion', 'valoracion_nickname_fkey', {
    foreignKeys: {
      columns: 'nickname',
      references: '"users"(nickname)',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    }
  });
  pgm.addConstraint('valoracion', 'valoracion_station_id_fkey', {
    foreignKeys: {
      columns: 'station_id',
      references: '"stations"(id)',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    }
  });
  pgm.addConstraint('valoracion', 'valoracion_score_check', 'CHECK (score >= 0 AND score <= 5)');
};

export const down = (pgm) => {
  pgm.dropTable('valoracion');
  pgm.dropTable('stations');
};

