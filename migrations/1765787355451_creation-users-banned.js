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
    // 1. Eliminar columna isBlock de users
    pgm.dropColumn('users', 'isBlock');

    // 2. Crear tabla usersBanned
    pgm.createTable('usersBanned', {
        email: {
            type: 'text',
            primaryKey: true,
            references: '"users"',
            onDelete: 'CASCADE',
        },
        reason: {
            type: 'text',
            notNull: true,
        },
        description: {
            type: 'text',
        },
        duration: {
            type: 'text',
            notNull: true,
        },
        created_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('current_timestamp'),
        },
    });

    // Índice para búsquedas rápidas
    pgm.createIndex('usersBanned', 'email');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    // 1. Eliminar tabla usersBanned
    pgm.dropTable('usersBanned');

    // 2. Volver a crear columna isBlock
    pgm.addColumn('users', {
        isBlock: {
            type: 'boolean',
            default: false,
            notNull: true,
        },
    });
};
