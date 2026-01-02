 


export const shorthands = undefined;


// UP: Lo que pasa cuando ejecutas la migración
export const up = (pgm) => {
 
  // 1. Eliminar columna vieja (si existía)
  // pgm.dropColumn('usersBanned', 'duration');


  // 2. Añadir nuevas columnas
  pgm.addColumns('usersBanned', {
    banned_until: {
      type: 'timestamp',
      notNull: false,
      comment: 'Fecha y hora exacta en la que el usuario será libre'
    },
    is_permanent: {
      type: 'boolean',
      notNull: true,
      default: false,
      comment: 'True si el usuario está baneado indefinidamente'
    }
  });


  // 3. Crear índice (Con protección 'ifNotExists' para que no falle)
  pgm.createIndex('usersBanned', 'email', { ifNotExists: true });
};


// DOWN: Deshacer cambios
export const down = (pgm) => {
  pgm.dropIndex('usersBanned', 'email');
  pgm.dropColumn('usersBanned', 'banned_until');
  pgm.dropColumn('usersBanned', 'is_permanent');
 
  // Restaurar la vieja si es necesario
  pgm.addColumn('usersBanned', {
    duration: { type: 'text' }
  });
};