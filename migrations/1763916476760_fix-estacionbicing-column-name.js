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
  pgm.renameColumn('estacionbicing', 'plazasTotales', 'plazastotales');
  pgm.renameColumn('estacionbicing', 'estacionCargaElectrica', 'estacioncargaelectrica');

  pgm.dropConstraint('estacionbicing', 'estacionbicing_plazasTotales_check', { ifExists: true });
  
  pgm.addConstraint('estacionbicing', 'estacionbicing_plazastotales_check', 'CHECK (plazastotales >= 0)');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropConstraint('estacionbicing', 'estacionbicing_plazastotales_check', { ifExists: true });
  pgm.addConstraint('estacionbicing', 'estacionbicing_plazasTotales_check', 'CHECK ("plazasTotales" >= 0)');
  pgm.renameColumn('estacionbicing', 'plazastotales', 'plazasTotales');
	pgm.renameColumn('estacionbicing', 'estacioncargaelectrica', 'estacionCargaElectrica');

};