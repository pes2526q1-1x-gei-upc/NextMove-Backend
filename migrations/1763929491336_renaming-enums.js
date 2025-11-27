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
  pgm.createType('MODE', ['BIKE', 'CAR'], { ifNotExists: true });

  // 2. Change column type to the new enum
  pgm.alterColumn('users', 'preferred_mode', { type: '"MODE"' , using: 'preferred_mode::text::"MODE"' });

  // 3. Drop old enum
  pgm.dropType('preferido', { ifExists: true });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.createType('preferido', ['electrico', 'bici'], { ifNotExists: true });

  // 2. Change column type back to old enum
  pgm.alterColumn('users', 'preferred_mode', { type: 'preferido' , using: 'preferred_mode::text::preferido' });

  // 3. Drop new enum
  pgm.dropType('MODE', { ifExists: true });
};
