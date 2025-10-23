// src/index.js
import 'dotenv/config';
import express from 'express';
import { createHandler } from 'graphql-http/lib/use/express';
import { ruruHTML } from 'ruru/server';
import schema from './graphql/schema.js';
import StationsService from './services/EVstationsService.js';
import syncWorker from './workers/EVstationsSyncWorker.js';
import bicingSyncWorker from './workers/EstacionDeBicingSyncWorker.js';

const stationsService = new StationsService();
const app = express();
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.use(express.json());

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
  }),
);

app.get('/api/gql/playground', (_req, res) => {
  res.type('html');
  res.end(ruruHTML({ endpoint: '/graphql' }));
});

app.get('/', (req, res) => {
  res.send('NextMove Backend funcionando');
});

// Test endpoints
app.get('/api/test/fetch-all', async (req, res) => {
  try {
    const stations = await stationsService.fetchAllStations();
    
    res.json({
      success: true,
      count: stations.length,
      timestamp: new Date().toISOString(),
      message: 'Data fetched and stored in memory',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.get('/api/test/cached', (req, res) => {
  const cached = stationsService.getCachedStations();
  
  if (!cached.stations) {
    return res.json({
      success: true,
      cached: false,
      message: 'No data in cache. Use /api/test/fetch-all first',
    });
  }

  res.json({
    success: true,
    cached: true,
    count: cached.count,
    lastFetch: cached.lastFetch,
    isFresh: cached.isFresh,
  });
});

app.post('/api/test/clear-cache', (req, res) => {
  stationsService.clearCache();
  
  res.json({
    success: true,
    message: 'Cache cleared',
  });
});


// Worker management endpoints

/**
 * GET /api/worker/stats
 * Returns current worker status and cache statistics
 */
app.get('/api/worker/stats', (req, res) => {
  const stats = syncWorker.getStats();
  
  res.json({
    success: true,
    worker: stats,
    cache: stationsService.getCachedStations(),
  });
});

/**
 * POST /api/worker/start
 * Manually starts the sync worker if it's not already running
 */
app.post('/api/worker/start', (req, res) => {
  syncWorker.start();
  
  res.json({
    success: true,
    message: 'Sync worker started',
    stats: syncWorker.getStats(),
  });
});

/**
 * POST /api/worker/stop
 * Stops the sync worker. Cache remains available but won't be updated.
 */
app.post('/api/worker/stop', (req, res) => {
  syncWorker.stop();
  
  res.json({
    success: true,
    message: 'Sync worker stopped',
    stats: syncWorker.getStats(),
  });
});

/**
 * POST /api/worker/sync-now
 * Triggers an immediate sync without waiting for the next scheduled interval
 */
app.post('/api/worker/sync-now', async (req, res) => {
  try {
    const result = await syncWorker.syncStations();
    
    res.json({
      success: result.success,
      message: 'Manual sync completed',
      result,
      stats: syncWorker.getStats(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/worker/interval
 * Updates the sync interval. Body must include {minutes: <number>}
 * Minimum interval is 1 minute.
 */
app.post('/api/worker/interval', (req, res) => {
  const { minutes } = req.body;
  
  if (!minutes || minutes < 1) {
    return res.status(400).json({
      success: false,
      error: 'Invalid interval. Minimum is 1 minute.',
    });
  }

  syncWorker.setSyncInterval(minutes * 60 * 1000);
  
  res.json({
    success: true,
    message: `Sync interval updated to ${minutes} minutes`,
    stats: syncWorker.getStats(),
  });
});

// Start server and workers
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log(`GraphQL Playground: http://localhost:${PORT}/api/gql/playground`);
  console.log('\nTest endpoints:');
  console.log(`  GET  ${PORT}/api/test/fetch-all     - Fetch all stations from API`);
  console.log(`  GET  ${PORT}/api/test/cached        - View cached data`);
  console.log(`  POST ${PORT}/api/test/clear-cache   - Clear memory cache`);
  console.log('\nWorker endpoints:');
  console.log(`  GET  ${PORT}/api/worker/stats       - View worker statistics`);
  console.log(`  POST ${PORT}/api/worker/start       - Start sync worker`);
  console.log(`  POST ${PORT}/api/worker/stop        - Stop sync worker`);
  console.log(`  POST ${PORT}/api/worker/sync-now    - Force immediate sync`);
  console.log(`  POST ${PORT}/api/worker/interval    - Update sync interval (body: {minutes: 5})`);
  
  console.log('\n');
  // Inicia el worker de las estaciones de vehículos eléctricos
  syncWorker.start();
  // Inicia el nuevo worker de las estaciones de Bicing
  bicingSyncWorker.start();
});

// Graceful shutdown - stops worker before process exit
process.on('SIGTERM', () => {
  console.log('\nSIGTERM received, shutting down gracefully');
  syncWorker.stop();
  bicingSyncWorker.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, shutting down gracefully');
  syncWorker.stop();
  bicingSyncWorker.stop(); 
  process.exit(0);
});