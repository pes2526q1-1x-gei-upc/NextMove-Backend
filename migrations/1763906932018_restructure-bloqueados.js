/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

export const up = (pgm) => {

  // Drop existing foreign keys first
  pgm.dropConstraint('bloqueados', 'bloqueados_id1_fkey', { ifExists: true });
  pgm.dropConstraint('bloqueados', 'bloqueados_id2_fkey', { ifExists: true });

  // Rename columns id1 -> nickname1, id2 -> nickname2
  pgm.renameColumn('bloqueados', 'id1', 'nickname1', { ifExists: true });
  pgm.renameColumn('bloqueados', 'id2', 'nickname2', { ifExists: true });

  // Add new foreign keys referencing users(nickname) with cascade
  pgm.addConstraint('bloqueados', 'bloqueados_nickname1_fkey', {
    foreignKeys: {
      columns: 'nickname1',
      references: '"users"(nickname)',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    }
  });
  pgm.addConstraint('bloqueados', 'bloqueados_nickname2_fkey', {
    foreignKeys: {
      columns: 'nickname2',
      references: '"users"(nickname)',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    }
  });

  // Ensure the check constraint exists
  pgm.addConstraint('bloqueados', 'bloqueados_no_self', 'CHECK (nickname1 <> nickname2)');

};

export const down = (pgm) => {

  // Drop the new constraints
  pgm.dropConstraint('bloqueados', 'bloqueados_nickname1_fkey', { ifExists: true });
  pgm.dropConstraint('bloqueados', 'bloqueados_nickname2_fkey', { ifExists: true });
  pgm.dropConstraint('bloqueados', 'bloqueados_no_self', { ifExists: true });

  // Rename columns back
  pgm.renameColumn('bloqueados', 'nickname1', 'id1', { ifExists: true });
  pgm.renameColumn('bloqueados', 'nickname2', 'id2', { ifExists: true });

  // Restore original foreign keys referencing users(id)
  pgm.addConstraint('bloqueados', 'bloqueados_id1_fkey', {
    foreignKeys: {
      columns: 'id1',
      references: '"users"(id)'
    }
  });
  pgm.addConstraint('bloqueados', 'bloqueados_id2_fkey', {
    foreignKeys: {
      columns: 'id2',
      references: '"users"(id)'
    }
  });

  // Restore the original check
  pgm.addConstraint('bloqueados', 'bloqueados_no_self', 'CHECK (id1 <> id2)');

};
