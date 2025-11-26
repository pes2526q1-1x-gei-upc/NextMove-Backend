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
  pgm.createType('preferido', ['electrico', 'bici']);
  pgm.createType('tipoConexion', ['CCS', 'CHADEMO', 'MENNEKES', 'SCHUKO']);
  pgm.createType('tipoCoche', ['electrico', 'hibrido']);
  pgm.createType('tipoCorriente', ['AC', 'DC']);
  pgm.createType('tipoVelocidad', ['superrapida', 'rapida', 'semirapida']);
  pgm.createType('metrica', ['n_puntos', 'd_recorrida', 'n_trayectos', 'n_conquistas', 'n_retos_completados']);
  pgm.sql('CREATE EXTENSION IF NOT EXISTS postgis');
};

export const down = (pgm) => {
  pgm.sql('DROP EXTENSION IF EXISTS postgis');
  pgm.dropType('metrica');
  pgm.dropType('tipoVelocidad');
  pgm.dropType('tipoCorriente');
  pgm.dropType('tipoCoche');
  pgm.dropType('tipoConexion');
  pgm.dropType('preferido');
};
