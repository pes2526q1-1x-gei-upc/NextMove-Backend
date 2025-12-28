 

exports.shorthands = undefined;

// UP: Lo que pasa cuando ejecutas la migración (npm run migrate up)
exports.up = (pgm) => {
  
  // PASO 1: Eliminamos la columna vieja 'duration' (tipo text)
  // Nota: Si es la primera vez que creas la tabla y no existía antes, 
  // comenta esta línea o dará error. Si la tabla ya existía con 'duration', déjalo así.
  // pgm.dropColumn('usersBanned', 'duration'); 

  // PASO 2: Añadimos las nuevas columnas estratégicas
  pgm.addColumns('usersBanned', {
    
    // a) banned_until: Aquí guardaremos la FECHA EXACTA del futuro.
    banned_until: {
      type: 'timestamp',
      notNull: false, 
      comment: 'Fecha y hora exacta en la que el usuario será libre'
    },

    // b) is_permanent: Un interruptor (flag) para saber rápido si es para siempre.
    is_permanent: {
      type: 'boolean',
      notNull: true,
      default: false,
      comment: 'True si el usuario está baneado indefinidamente'
    }
  });

  // PASO 3: Indexamos el email (Performance)
  // Solo si no existe ya un índice para email en esta tabla
  pgm.createIndex('usersBanned', 'email');
};

// DOWN: Lo que pasa si te arrepientes y deshaces cambios (npm run migrate down)
exports.down = (pgm) => {
  // 1. Borramos el índice creado
  pgm.dropIndex('usersBanned', 'email');

  // 2. Borramos las columnas nuevas
  pgm.dropColumn('usersBanned', 'banned_until');
  pgm.dropColumn('usersBanned', 'is_permanent');

  // 3. Volvemos a crear la vieja (si la borraste en el UP)
  pgm.addColumn('usersBanned', {
    duration: { type: 'text' }
  });
};