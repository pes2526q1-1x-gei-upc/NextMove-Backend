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
  pgm.addColumn('users',{
    points: {
      type: 'integer',
      notNull: true,
      default: 0
    }
  });
  pgm.createFunction('update_user_challenge',[],{returns: 'trigger', language: 'plpgsql', replace: true},
    `
    DECLARE
      had_active BOOLEAN;
      reto_id varchar;
    BEGIN
      select exists (SELECT 1 FROM usuario_retos WHERE email = NEW.user_email AND active IS TRUE) INTO had_active;
      select id FROM usuario_retos WHERE email = NEW.user_email AND active IS TRUE LIMIT 1 INTO reto_id;
      UPDATE usuario_retos
      SET 
        current_distance = LEAST(current_distance + NEW.distancia, total_distance),
        completed = LEAST((current_distance + NEW.distancia) / total_distance * 100, 100),
        active = CASE WHEN LEAST((current_distance + NEW.distancia), total_distance) >= total_distance THEN NULL ELSE active
                    END
        WHERE email = NEW.user_email AND active IS TRUE;
      IF had_active and not exists (SELECT 1 FROM usuario_retos WHERE email = NEW.user_email AND active IS TRUE) THEN
        UPDATE users
        SET points = points + (SELECT points FROM retos WHERE id = reto_id)
        WHERE email = NEW.user_email;
      END IF;
      RETURN NEW;
    END;`
  );
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropColumn('users', 'points');
  pgm.createFunction('update_user_challenge',[],{returns: 'trigger', language: 'plpgsql', replace: true},
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
};
