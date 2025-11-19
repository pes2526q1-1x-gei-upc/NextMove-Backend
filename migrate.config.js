import fs from 'fs';

export default {
  migrationFolder: './migrations',
  dbConfig: {
    connectionString: 'postgres://bemotion:bemotion@bemotiondb.cpousga2gpuk.eu-south-2.rds.amazonaws.com:5432/bemotiondb?ssl=true',
    ssl: {
      ca: fs.readFileSync('./rds-combined-ca-bundle.pem'), // <=== NO toString()
      rejectUnauthorized: true,
    },
  },
};
