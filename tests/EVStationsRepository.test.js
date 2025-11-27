import { applyDatabaseMock, mockQuery, mockClient } from './helpers/databaseMock.js';
await applyDatabaseMock();
const { default: EVStationsRepository } = await import('../src/repositories/EVStationsRepository.js');

// Datos mock reutilizables
const mockStationInput = {
  arrayIndex: 0,
  id: 'ES/ENX/12345',
  name: 'Estación Test Barcelona',
  address: 'Carrer de Provença, 123',
  city: 'Barcelona',
  longitude: 2.1734,
  latitude: 41.3851,
  ccs_power_kw: 50,
  chademo_power_kw: 50,
  mennekes_power_kw: 22,
  schuko_power_kw: null
};

// Simula una fila de la BD
const mockDbRow = {
  id: 0,
  external_id: 'ES/ENX/12345',
  name: 'Estación Test Barcelona',
  address: 'Carrer de Provença, 123',
  city: 'Barcelona',
  longitude: 2.1734,
  latitude: 41.3851,
  ccs_power_kw: 50,
  chademo_power_kw: 50,
  mennekes_power_kw: 22,
  schuko_power_kw: null,
  created_at: '2025-11-20T10:00:00Z',
  updated_at: '2025-11-20T10:00:00Z',
  last_synced_at: '2025-11-20T10:00:00Z'
};

describe('EVStationsRepository - CRUD (mocked pool)', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockClient.query.mockReset();
    mockClient.release.mockReset();
  });

  // Tests SIN transacciones (usan mockQuery)
  test('getAllStations: retorna lista de estaciones', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [mockDbRow] });
    
    const repo = new EVStationsRepository();
    const res = await repo.getAllStations();

    expect(mockQuery).toHaveBeenCalled();
    expect(res).toHaveLength(1);
  });

  test('getStationById: retorna null si no existe', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    
    const repo = new EVStationsRepository();
    const res = await repo.getStationById(9999);

    expect(res).toBeNull();
  });

  test('getNearbyStations: retorna estaciones cercanas', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [mockDbRow] });
    
    const repo = new EVStationsRepository();
    const res = await repo.getNearbyStations(41.3851, 2.1734, 5);

    expect(res).toHaveLength(1);
  });

  test('getStationsByCity: retorna estaciones de una ciudad', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [mockDbRow] });
    
    const repo = new EVStationsRepository();
    const res = await repo.getStationsByCity('Barcelona');

    expect(res).toHaveLength(1);
  });

  test('deleteAllStations: elimina todas las estaciones', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 2302 });
    
    const repo = new EVStationsRepository();
    const count = await repo.deleteAllStations();

    expect(count).toBe(2302);
  });

  test('getStationsCount: retorna el número correcto', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ count: '2302' }] });
    
    const repo = new EVStationsRepository();
    const count = await repo.getStationsCount();

    expect(count).toBe(2302);
  });

  test('getExternalIdsChecksum: retorna checksum MD5', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ checksum: 'abc123' }] });
    
    const repo = new EVStationsRepository();
    const checksum = await repo.getExternalIdsChecksum();

    expect(checksum).toBe('abc123');
  });

  // Tests CON transacciones (usan mockClient.query)
  test('batchInsertStations: inserta múltiples estaciones correctamente', async () => {
    const stations = [
      mockStationInput, 
      { ...mockStationInput, arrayIndex: 1, id: 'ES/ENX/67890' }
    ];
    
    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({}) // INSERT 1
      .mockResolvedValueOnce({}) // INSERT 2
      .mockResolvedValueOnce({}); // COMMIT
    
    const repo = new EVStationsRepository();
    const count = await repo.batchInsertStations(stations);

    expect(count).toBe(2);
    expect(mockClient.query).toHaveBeenCalledTimes(4);
    expect(mockClient.release).toHaveBeenCalled();
  });

  test('batchInsertStations: hace ROLLBACK si falla una inserción', async () => {
    const stations = [mockStationInput];
    
    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockRejectedValueOnce(new Error('Insert failed')); // INSERT falla
    
    const repo = new EVStationsRepository();
    await expect(repo.batchInsertStations(stations)).rejects.toThrow('Insert failed');
    
    // Verifica que se llamó ROLLBACK
    const calls = mockClient.query.mock.calls;
    expect(calls.some(call => call[0] === 'ROLLBACK')).toBe(true);
    expect(mockClient.release).toHaveBeenCalled();
  });

  test('batchInsertStations: maneja estaciones sin conectores opcionales', async () => {
    const stationNoConnectors = {
      ...mockStationInput,
      ccs_power_kw: null,
      chademo_power_kw: null,
      mennekes_power_kw: null,
      schuko_power_kw: null
    };
    
    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({}) // INSERT
      .mockResolvedValueOnce({}); // COMMIT
    
    const repo = new EVStationsRepository();
    const count = await repo.batchInsertStations([stationNoConnectors]);

    expect(count).toBe(1);
  });

  test('batchInsertStations: propaga errores de base de datos', async () => {
    mockClient.query.mockRejectedValueOnce(new Error('DB connection failed'));
    
    const repo = new EVStationsRepository();
    await expect(repo.batchInsertStations([mockStationInput])).rejects.toThrow('DB connection failed');
  });
});