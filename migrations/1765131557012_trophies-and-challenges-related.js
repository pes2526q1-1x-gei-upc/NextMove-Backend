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
    pgm.dropTable('trofeo');
    pgm.createTable('retos', {
        id: {
            type: 'varchar(50)', primaryKey: true
        },
        name: {
            type: 'varchar(100)', notNull: true, unique: true
        },
        distance: {
            type: 'integer', notNull: true
        },
        description: {
            type: 'text', notNull: true
        },
        starting_date: {
            type: 'date', notNull: true
        },
        ending_date: {
            type: 'date', notNull: true
        },
        points: {
            type: 'integer', notNull: true
        },
    });
    pgm.addConstraint('retos', 'retos_valid_dates', 'CHECK (starting_date < ending_date)');
    pgm.addConstraint('retos', 'retos_positive_points', 'CHECK (points >= 0)');
    pgm.addConstraint('retos', 'retos_positive_distance', 'CHECK (distance >= 0)');
    pgm.createTable('usuario_retos', {
        email: {
            type: 'varchar(150)'
        },
        id: {
            type: 'varchar(50)'
        },
        completed: {
            type: 'integer', default: 0, notNull: true
        },
    });
    pgm.addConstraint('usuario_retos', 'usuario_retos_pkey', {
        primaryKey: ['email', 'id']
    });
    pgm.addConstraint('usuario_retos', 'usuario_retos_email_fkey', {
        foreignKeys: {
            columns: 'email',
            references: '"users"(email)',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        }
    });
    pgm.addConstraint('usuario_retos', 'usuario_retos_id_fkey', {
        foreignKeys: {
            columns: 'id',
            references: '"retos"(id)',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        }
    });
    pgm.addConstraint('usuario_retos', 'usuario_retos_completed', 'CHECK (completed >= 0 and completed <= 100)');
}
/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    pgm.dropTable('usuario_retos');
    pgm.dropTable('retos');
      pgm.createTable('trofeo', {
    id: { type: 'varchar(20)', primaryKey: true },
    metrica: { type: 'metrica', notNull: true },
    imagen: { type: 'varchar(100)', notNull: true, unique: true },
    descripcion: { type: 'varchar(200)' },
    nombre: { type: 'varchar(200)', notNull: true, unique: true },
    valor_necesario: { type: 'integer' }
  });
  pgm.addConstraint('trofeo', 'trofeo_valorNecesario_check', 'CHECK (valor_necesario > 0)');
};
