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
  pgm.addColumns('recorridos', {
    velocidad_maxima: {
      type: 'float', 
      notNull: true,
      default: 0,
      check: 'velocidad_maxima >= 0'
    },
    elevacion_positiva: {
      type: 'float', 
      notNull: true, 
      default: 0, 
      check: 'elevacion_positiva >= 0', 
    }, 
    elevacion_negativa: {
      type: 'float', 
      notNull: true, 
      default: 0, 
      check: 'elevacion_negativa >= 0'
    },
    tiempo_inicio: {
      type: 'TIMESTAMPTZ', 
      notNull: true,
      default: pgm.func('current_timestamp')
    },
    tiempo_fin: {
      type: 'TIMESTAMPTZ', 
      notNull: true,
      default: pgm.func('current_timestamp') 
    }
  });
};
/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropColumns('recorridos', [
    'velocidad_maxima', 
    'elevacion_positiva',
    'elevacion_negativa',
    'tiempo_inicio', 
    'tiempo_fin'
  ]); 
};
