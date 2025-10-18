// src/index.js
import 'dotenv/config';
import express from 'express';
import { createHandler } from 'graphql-http/lib/use/express';
import { ruruHTML } from 'ruru/server';
import schema from './graphql/schema.js';
import StationsService  from './services/stationsService.js';
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

// This is not the best way to handle CORS in production, more robust solutions should be used.
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
    sample: cached.stations.slice(0, 3),
  });
});

app.post('/api/test/clear-cache', (req, res) => {
  stationsService.clearCache();
  
  res.json({
    success: true,
    message: 'Cache cleared',
  });
});


app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
  console.log(`GraphQL Playground: http://localhost:${PORT}/api/gql/playground`);
  console.log('\nTest endpoints:');
  console.log(`  GET  ${PORT}/api/test/fetch-all     - Fetch all stations from API`);
  console.log(`  GET  ${PORT}/api/test/cached        - View cached data`);
  console.log(`  POST ${PORT}/api/test/clear-cache   - Clear memory cache`);
});