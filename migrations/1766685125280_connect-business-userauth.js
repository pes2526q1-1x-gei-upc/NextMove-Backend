export const shorthands = undefined;

export async function up(pgm) {
  // 1. Agrandamos la columna URL (S3 genera URLs largas)
  pgm.alterColumn('empresas', 'url', {
    type: 'varchar(500)',
  });

  // 2. Añadimos la relación con la tabla de usuarios de Django
  pgm.addColumns('empresas', {
    usuario_id: {
      type: 'integer',
      unique: true,          
      notNull: false,        
      references: '"auth_user"', 
      onDelete: 'CASCADE',   
    },
  });
  
  // Crear índice para búsqueda rápida
  pgm.createIndex('empresas', 'usuario_id');
}

export async function down(pgm) {
  // Deshacer cambios en caso de rollback
  pgm.dropColumns('empresas', ['usuario_id']);
  pgm.alterColumn('empresas', 'url', {
    type: 'varchar(100)', 
  });
}