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
  pgm.createTable('trofeo', {
    id: { type: 'varchar(20)', primaryKey: true },
    metrica: { type: 'metrica', notNull: true },
    imagen: { type: 'varchar(100)', notNull: true, unique: true },
    descripcion: { type: 'varchar(200)' },
    nombre: { type: 'varchar(200)', notNull: true, unique: true },
    valorNecesario: { type: 'integer' }
  });
  pgm.addConstraint('trofeo', 'trofeo_valorNecesario_check', 'CHECK (valorNecesario > 0)');
};

export const down = (pgm) => {
  pgm.dropTable('trofeo');
};
