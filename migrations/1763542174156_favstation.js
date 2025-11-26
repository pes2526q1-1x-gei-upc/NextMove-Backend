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
  pgm.createTable('favstation', {
    user_id: { type: 'varchar(100)', notNull: true },
    station_id: { type: 'varchar(20)', notNull: true }
  }, {
    primaryKey: ['user_id', 'station_id']
  });
  pgm.addConstraint('favstation', 'favstation_user_id_fkey', {
    foreignKeys: {
      columns: 'user_id',
      references: '"users"(email)'
    }
  });
  pgm.addConstraint('favstation', 'favstation_station_id_fkey', {
    foreignKeys: {
      columns: 'station_id',
      references: '"stations"(id)'
    }
  });
};

export const down = (pgm) => {
  pgm.dropTable('favstation');
};
