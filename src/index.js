// src/index.js
import 'dotenv/config';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger.js';

import express from 'express';
import { createHandler } from 'graphql-http/lib/use/express';
import { ruruHTML } from 'ruru/server';
import schema from './graphql/schema.js';
import StationsService from './services/EVstationsService.js';
import syncWorker from './workers/EVstationsSyncWorker.js';
import bicingSyncWorker from './workers/EstacionDeBicingSyncWorker.js';
import { createContext } from './graphql/context.js';
import routingRoutes from './routes/routingRoutes.js';

const stationsService = new StationsService();
const app = express();
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.use(express.json());
app.use('/api/routing', routingRoutes);

app.options('/graphql', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.sendStatus(200);
});

app.all(
  '/graphql',
  (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
  },
  createHandler({
    schema: schema,
    context: (req, res) => createContext(req, res),
  }),
);

app.get('/api/gql/playground', (_req, res) => {
  res.type('html');
  res.end(ruruHTML({ endpoint: '/graphql' }));
});

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'NextMove API Documentation'
}));

app.get('/', (req, res) => {
  res.send('NextMove Backend funcionando');
});




// Start server and worker
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log(`GraphQL Playground: http://localhost:${PORT}/api/gql/playground`);
  console.log(`API Documentation at http://localhost:${PORT}/api-docs`);

  syncWorker.start();
  bicingSyncWorker.start();
});

// Graceful shutdown - stops worker before process exit
process.on('SIGTERM', () => {
  console.log('\nSIGTERM received, shutting down gracefully');
  syncWorker.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, shutting down gracefully');
  syncWorker.stop();
  process.exit(0);
});