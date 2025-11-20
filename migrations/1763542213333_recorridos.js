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
  pgm.createTable('recorridos', {
    id: { type: 'serial', primaryKey: true },
    user_email: { type: 'varchar(150)', notNull: true },
    distancia: { type: 'float', notNull: true },
    velocidad_media: { type: 'float', notNull: true },
    co2: { type: 'float', notNull: true },
    kcal: { type: 'float', notNull: true },
    origen: { type: 'point', notNull: true },
    destino: { type: 'point', notNull: true },
    fecha_recorrido: { type: 'timestamptz', default: pgm.func('current_timestamp') }
  });

  pgm.addConstraint('recorridos', 'recorridos_distancia_check', 'CHECK (distancia >= 0)');
  pgm.addConstraint('recorridos', 'recorridos_velocidad_media_check', 'CHECK (velocidad_media >= 0)');
  pgm.addConstraint('recorridos', 'recorridos_co2_check', 'CHECK (co2 >= 0)');
  pgm.addConstraint('recorridos', 'recorridos_kcal_check', 'CHECK (kcal >= 0)');
  pgm.addConstraint('recorridos', 'recorridos_user_email_fkey', {
    foreignKeys: {
      columns: 'user_email',
      references: '"users"(email)',
      onDelete: 'CASCADE'
    }
  });
};

export const down = (pgm) => {
  pgm.dropTable('recorridos');
};
