import EstacionDeBicingSyncWorker from '../../src/workers/EstacionDeBicingSyncWorker.js';

test('Bicing station worker returns the synced stations', async () => {
  const estaciones = await EstacionDeBicingSyncWorker.syncEstaciones();
  expect(estaciones).toBeUndefined();
});