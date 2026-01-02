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
  pgm.addColumn('usuario_retos',{
    total_distance: {type: 'float', notNull: true},
    current_distance: {type: 'float', notNull: true, default: 0},
    active: {type: 'boolean', default: true}
  });
  pgm.addConstraint('usuario_retos','usuario_retos_total_distance_check','CHECK (total_distance > 0)');
  pgm.addConstraint('usuario_retos','usuario_retos_current_distance_check','CHECK (current_distance >= 0 AND current_distance <= total_distance)');
  pgm.addConstraint('usuario_retos','unique_active_challenge_per_user','UNIQUE (email,active)');
  pgm.createFunction('update_user_challenge',[],{returns: 'trigger', language: 'plpgsql'},
    `BEGIN
      UPDATE usuario_retos
      SET 
        current_distance = LEAST(current_distance + NEW.distancia, total_distance),
        completed = LEAST((current_distance + NEW.distancia) / total_distance * 100, 100),
        active = CASE WHEN LEAST((current_distance + NEW.distancia), total_distance) >= total_distance THEN FALSE ELSE active
                    END
        WHERE email = NEW.user_email AND active IS TRUE;
      RETURN NEW;
    END;`
  );
  pgm.createTrigger('recorridos','after_insert_update_user_challenge',{
    when: 'AFTER',
    level: 'ROW',
    operation: 'INSERT',
    function: 'update_user_challenge'
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTrigger('recorridos','after_insert_update_user_challenge');
  pgm.dropFunction('update_user_challenge');
  pgm.dropConstraint('usuario_retos','usuario_retos_total_distance_check');
  pgm.dropConstraint('usuario_retos','usuario_retos_current_distance_check');
  pgm.dropConstraint('usuario_retos','unique_active_challenge_per_user');
  pgm.dropColumns('usuario_retos',['total_distance','current_distance','active']);
};
