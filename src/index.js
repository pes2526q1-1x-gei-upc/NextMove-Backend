import 'dotenv/config';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger.js';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createHandler } from 'graphql-http/lib/use/express';
import { ruruHTML } from 'ruru/server';
import schema from './graphql/schema.js';
import syncWorker from './workers/EVstationsSyncWorker.js';
import bicingSyncWorker from './workers/EstacionDeBicingSyncWorker.js';
import alertNotificationWorker from './workers/AlertNotificationWorker.js';
import banExpirationWorker from './workers/BanExpirationWorker.js';
import { createContext } from './graphql/context.js';
import routingRoutes from './routes/routingRoutes.js';
import uploadProfilePhotoRouter from './routes/uploadProfilePhoto.js';
import banRoutes from './routes/banRoutes.js';
import { setupSocketHandlers } from './sockets/chatHandler.js';
import cors from 'cors';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3000;

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// Exportar io para uso en otros módulos
export { io };

app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-API-Key'],
  credentials: true
}));

app.use('/api', uploadProfilePhotoRouter);
app.use('/api/ban', banRoutes);

app.use((req, res, next) => {
  // Filtrar peticiones GraphQL para no saturar los logs
  if (req.url !== '/graphql') {
  console.log(`${req.method} ${req.url}`);
  }
  next();
});

app.use(express.json());

initGraphQL();

// Routing API routes, and swagger docs
app.use('/api/routing', routingRoutes);
initSwagger();

app.get('/', (req, res) => {
  res.send('NextMove Backend funcionando');
});

// Health check endpoint para Socket.IO
app.get('/socket/health', (req, res) => {
  res.json({
    status: 'ok',
    connections: io.engine.clientsCount,
    timestamp: new Date().toISOString()
  });
});


setupSocketHandlers(io);

// Start server and workers
httpServer.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log(`GraphQL Playground: http://localhost:${PORT}/api/gql/playground`);
  console.log(`API Documentation at http://localhost:${PORT}/api-docs`);
  console.log(`Socket.IO ready on port ${PORT}`);

  syncWorker.start();
  bicingSyncWorker.start();
  alertNotificationWorker.start();
  banExpirationWorker.start();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\nSIGTERM received, shutting down gracefully');
  io.close(() => {
    console.log('Socket.IO connections closed');
  });
  syncWorker.stop();
  bicingSyncWorker.stop();
  alertNotificationWorker.stop();
  banExpirationWorker.stop();
  httpServer.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, shutting down gracefully');
  io.close(() => {
    console.log('Socket.IO connections closed');
  });
  syncWorker.stop();
  bicingSyncWorker.stop();
  alertNotificationWorker.stop();
  banExpirationWorker.stop();
  httpServer.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

function initGraphQL() {
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
      context: (req, res) => createContext(req, res, io),
    }),
  );

  app.get('/api/gql/playground', (_req, res) => {
    res.type('html');
    res.end(ruruHTML({ endpoint: '/graphql' }));
  });
}

function initSwagger() {
  const swaggerOptions = {
    explorer: true,
    customCss: `
      .swagger-ui .topbar { 
        background-color: #2c3e50; 
      }
      .swagger-ui .info .title {
        color: #2c3e50;
      }
    `,
    customSiteTitle: "NextMove Routing API - Documentación",
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'list',
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
    }
  };

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerOptions));
  
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}