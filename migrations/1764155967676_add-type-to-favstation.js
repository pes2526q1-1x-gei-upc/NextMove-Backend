export const up = (pgm) => {
  pgm.addColumn('favstation', { station_type: { type: '"MODE"', notNull: true } });
    pgm.addConstraint('favstation', 'favstation_pkey', {
      primaryKey: ['email', 'station_id', 'station_type']
    });
  
};

export const down = (pgm) => {
  pgm.dropConstraint('favstation', 'favstation_pkey');
  pgm.dropColumn('favstation', 'station_type');
};

