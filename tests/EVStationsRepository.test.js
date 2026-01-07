import { applyDatabaseMock, mockQuery, mockClient } from './helpers/databaseMock.js';
await applyDatabaseMock();
const { default: EVStationsRepository } = await import('../src/repositories/EVStationsRepository.js');
import { jest } from '@jest/globals';

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
  describe('getAllStationIds', () => {
    test('retorna array de IDs ordenados', async () => {
      mockQuery.mockResolvedValueOnce({ 
        rows: [{ id: 0 }, { id: 1 }, { id: 2 }] 
      });
      
      const repo = new EVStationsRepository();
      const result = await repo.getAllStationIds();

      expect(result).toEqual([0, 1, 2]);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id FROM ev_stations ORDER BY id')
      );
    });

    test('retorna array vacío si no hay estaciones', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      
      const repo = new EVStationsRepository();
      const result = await repo.getAllStationIds();

      expect(result).toEqual([]);
    });

    test('maneja errores correctamente', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockQuery.mockRejectedValueOnce(new Error('Query failed'));
      
      const repo = new EVStationsRepository();
      await expect(repo.getAllStationIds()).rejects.toThrow('Query failed');
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('deleteStationsByIds', () => {
    test('elimina estaciones por IDs', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 3 });
      
      const repo = new EVStationsRepository();
      const count = await repo.deleteStationsByIds([0, 1, 2]);

      expect(count).toBe(3);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM ev_stations WHERE id IN'),
        [0, 1, 2]
      );
    });

    test('retorna 0 si array está vacío', async () => {
      const repo = new EVStationsRepository();
      const count = await repo.deleteStationsByIds([]);

      expect(count).toBe(0);
      expect(mockQuery).not.toHaveBeenCalled();
    });

    test('retorna 0 si input es null', async () => {
      const repo = new EVStationsRepository();
      const count = await repo.deleteStationsByIds(null);

      expect(count).toBe(0);
      expect(mockQuery).not.toHaveBeenCalled();
    });

    test('genera placeholders correctos para múltiples IDs', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 2 });
      
      const repo = new EVStationsRepository();
      await repo.deleteStationsByIds([5, 10]);

      const query = mockQuery.mock.calls[0][0];
      expect(query).toContain('$1, $2');
    });

    test('maneja errores correctamente', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockQuery.mockRejectedValueOnce(new Error('Delete failed'));
      
      const repo = new EVStationsRepository();
      await expect(repo.deleteStationsByIds([0, 1])).rejects.toThrow('Delete failed');
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('getAllStations', () => {
    test('retorna lista de estaciones ordenadas', async () => {
      const stations = [mockDbRow, { ...mockDbRow, id: 1, name: 'Otra estación' }];
      mockQuery.mockResolvedValueOnce({ rows: stations });
      
      const repo = new EVStationsRepository();
      const result = await repo.getAllStations();

      expect(mockQuery).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    test('retorna array vacío si no hay estaciones', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      
      const repo = new EVStationsRepository();
      const result = await repo.getAllStations();

      expect(result).toEqual([]);
    });

    test('maneja errores correctamente', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockQuery.mockRejectedValueOnce(new Error('Fetch all failed'));
      
      const repo = new EVStationsRepository();
      await expect(repo.getAllStations()).rejects.toThrow('Fetch all failed');
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('getStationById', () => {
    test('retorna estación si existe', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockDbRow] });
      
      const repo = new EVStationsRepository();
      const result = await repo.getStationById(0);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        [0]
      );
      expect(result).toEqual(mockDbRow);
    });

    test('retorna null si no existe', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      
      const repo = new EVStationsRepository();
      const result = await repo.getStationById(9999);

      expect(result).toBeNull();
    });

    test('maneja errores correctamente', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockQuery.mockRejectedValueOnce(new Error('Fetch failed'));
      
      const repo = new EVStationsRepository();
      await expect(repo.getStationById(0)).rejects.toThrow('Fetch failed');
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('getNearbyStations', () => {
    test('retorna estaciones cercanas', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockDbRow] });
      
      const repo = new EVStationsRepository();
      const result = await repo.getNearbyStations(41.3851, 2.1734, 5);

      expect(result).toHaveLength(1);
    });

    test('incluye campo distance en resultados', async () => {
      const stationWithDistance = { ...mockDbRow, distance: 2.5 };
      mockQuery.mockResolvedValueOnce({ rows: [stationWithDistance] });
      
      const repo = new EVStationsRepository();
      const result = await repo.getNearbyStations(41.3851, 2.1734, 5);

      expect(result[0]).toHaveProperty('distance', 2.5);
    });

    test('usa radio por defecto de 5km', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      
      const repo = new EVStationsRepository();
      await repo.getNearbyStations(41.3851, 2.1734);

      const callArgs = mockQuery.mock.calls[0][1];
      expect(callArgs[2]).toBe(5);
    });

    test('maneja errores correctamente', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockQuery.mockRejectedValueOnce(new Error('Nearby query failed'));
      
      const repo = new EVStationsRepository();
      await expect(repo.getNearbyStations(41.3851, 2.1734, 5)).rejects.toThrow('Nearby query failed');
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('getStationsByCity', () => {
    test('retorna estaciones de una ciudad', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockDbRow] });
      
      const repo = new EVStationsRepository();
      const result = await repo.getStationsByCity('Barcelona');

      expect(result).toHaveLength(1);
    });

    test('usa ILIKE para búsqueda case-insensitive', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockDbRow] });
      
      const repo = new EVStationsRepository();
      await repo.getStationsByCity('barcelona');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        ['%barcelona%']
      );
    });

    test('retorna array vacío si no hay coincidencias', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      
      const repo = new EVStationsRepository();
      const result = await repo.getStationsByCity('NoExiste');

      expect(result).toEqual([]);
    });

    test('maneja errores correctamente', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockQuery.mockRejectedValueOnce(new Error('City query failed'));
      
      const repo = new EVStationsRepository();
      await expect(repo.getStationsByCity('Barcelona')).rejects.toThrow('City query failed');
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('getStationsByAddress', () => {
    test('retorna estaciones por dirección', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockDbRow] });
      
      const repo = new EVStationsRepository();
      const result = await repo.getStationsByAddress('Provença');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        ['%Provença%']
      );
      expect(result).toHaveLength(1);
    });

    test('usa ILIKE para búsqueda parcial', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockDbRow] });
      
      const repo = new EVStationsRepository();
      await repo.getStationsByAddress('Carrer');

      const callArgs = mockQuery.mock.calls[0][1];
      expect(callArgs[0]).toBe('%Carrer%');
    });

    test('retorna array vacío si no hay coincidencias', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      
      const repo = new EVStationsRepository();
      const result = await repo.getStationsByAddress('NoExiste');

      expect(result).toEqual([]);
    });

    test('maneja errores correctamente', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockQuery.mockRejectedValueOnce(new Error('Query failed'));
      
      const repo = new EVStationsRepository();
      await expect(repo.getStationsByAddress('Test')).rejects.toThrow('Query failed');
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('getStationsInBounds', () => {
    test('retorna estaciones en área geográfica', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockDbRow] });
      
      const repo = new EVStationsRepository();
      const result = await repo.getStationsInBounds(42.0, 41.0, 2.5, 2.0);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        [42.0, 41.0, 2.5, 2.0]
      );
      expect(result).toHaveLength(1);
    });

    test('retorna array vacío si no hay estaciones en el área', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      
      const repo = new EVStationsRepository();
      const result = await repo.getStationsInBounds(42.0, 41.0, 2.5, 2.0);

      expect(result).toEqual([]);
    });

    test('maneja errores correctamente', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockQuery.mockRejectedValueOnce(new Error('Bounds query failed'));
      
      const repo = new EVStationsRepository();
      await expect(repo.getStationsInBounds(42.0, 41.0, 2.5, 2.0)).rejects.toThrow('Bounds query failed');
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('deleteAllStations', () => {
    test('elimina todas las estaciones', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 2302 });
      
      const repo = new EVStationsRepository();
      const count = await repo.deleteAllStations();

      expect(count).toBe(2302);
    });

    test('retorna 0 si no hay estaciones para eliminar', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0 });
      
      const repo = new EVStationsRepository();
      const count = await repo.deleteAllStations();

      expect(count).toBe(0);
    });

    test('maneja errores correctamente', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockQuery.mockRejectedValueOnce(new Error('Delete failed'));
      
      const repo = new EVStationsRepository();
      await expect(repo.deleteAllStations()).rejects.toThrow('Delete failed');
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('getStationsCount', () => {
    test('retorna el número correcto', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '2302' }] });
      
      const repo = new EVStationsRepository();
      const count = await repo.getStationsCount();

      expect(count).toBe(2302);
    });

    test('retorna 0 si no hay estaciones', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }] });
      
      const repo = new EVStationsRepository();
      const count = await repo.getStationsCount();

      expect(count).toBe(0);
    });

    test('maneja errores correctamente', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockQuery.mockRejectedValueOnce(new Error('Count failed'));
      
      const repo = new EVStationsRepository();
      await expect(repo.getStationsCount()).rejects.toThrow('Count failed');
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('getExternalIdsChecksum', () => {
    test('retorna checksum MD5', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ checksum: 'abc123' }] });
      
      const repo = new EVStationsRepository();
      const checksum = await repo.getExternalIdsChecksum();

      expect(checksum).toBe('abc123');
    });

    test('retorna null si no hay resultados', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      
      const repo = new EVStationsRepository();
      const result = await repo.getExternalIdsChecksum();

      expect(result).toBeNull();
    });

    test('retorna null si hay error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockQuery.mockRejectedValueOnce(new Error('Checksum failed'));
      
      const repo = new EVStationsRepository();
      const result = await repo.getExternalIdsChecksum();

      expect(result).toBeNull();
      
      consoleErrorSpy.mockRestore();
    });
  });

  // Tests CON transacciones (usan mockClient.query)
  describe('batchInsertStations', () => {
    test('inserta múltiples estaciones correctamente', async () => {
      const stations = [
        mockStationInput, 
        { ...mockStationInput, arrayIndex: 1, id: 'ES/ENX/67890' }
      ];
      
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // INSERT stations
        .mockResolvedValueOnce({}) // INSERT ev_stations
        .mockResolvedValueOnce({}); // COMMIT
      
      const repo = new EVStationsRepository();
      const count = await repo.batchInsertStations(stations);

      expect(count).toBe(2);
      expect(mockClient.query).toHaveBeenCalledTimes(4);
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('retorna 0 si array está vacío', async () => {
      const repo = new EVStationsRepository();
      const count = await repo.batchInsertStations([]);

      expect(count).toBe(0);
      expect(mockClient.query).not.toHaveBeenCalled();
    });

    test('retorna 0 si input es null', async () => {
      const repo = new EVStationsRepository();
      const count = await repo.batchInsertStations(null);

      expect(count).toBe(0);
      expect(mockClient.query).not.toHaveBeenCalled();
    });

    test('hace ROLLBACK si falla una inserción', async () => {
      const stations = [mockStationInput];
      
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockRejectedValueOnce(new Error('Insert failed')); // INSERT falla
      
      const repo = new EVStationsRepository();
      await expect(repo.batchInsertStations(stations)).rejects.toThrow('Insert failed');
      
      const calls = mockClient.query.mock.calls;
      expect(calls.some(call => call[0] === 'ROLLBACK')).toBe(true);
      expect(mockClient.release).toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });

    test('maneja estaciones sin conectores opcionales', async () => {
      const stationNoConnectors = {
        ...mockStationInput,
        ccs_power_kw: null,
        chademo_power_kw: null,
        mennekes_power_kw: null,
        schuko_power_kw: null
      };
      
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // INSERT stations
        .mockResolvedValueOnce({}) // INSERT ev_stations
        .mockResolvedValueOnce({}); // COMMIT
      
      const repo = new EVStationsRepository();
      const count = await repo.batchInsertStations([stationNoConnectors]);

      expect(count).toBe(1);
    });

    test('genera IDs con sufijo _CAR correctamente', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // INSERT stations
        .mockResolvedValueOnce({}) // INSERT ev_stations
        .mockResolvedValueOnce({}); // COMMIT
      
      const repo = new EVStationsRepository();
      await repo.batchInsertStations([mockStationInput]);

      const calls = mockClient.query.mock.calls;
      const stationsInsert = calls.find(call => call[0]?.includes('INSERT INTO stations'));
      expect(stationsInsert[1]).toContain('0_CAR');
    });

    test('usa ST_MakePoint con SRID 4326', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // INSERT stations
        .mockResolvedValueOnce({}) // INSERT ev_stations
        .mockResolvedValueOnce({}); // COMMIT
      
      const repo = new EVStationsRepository();
      await repo.batchInsertStations([mockStationInput]);

      const calls = mockClient.query.mock.calls;
      const evStationsInsert = calls.find(call => call[0]?.includes('INSERT INTO ev_stations'));
      expect(evStationsInsert[0]).toContain('ST_SetSRID(ST_MakePoint');
      expect(evStationsInsert[0]).toContain('4326');
    });

    test('propaga errores de base de datos', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
      mockClient.query.mockRejectedValueOnce(new Error('DB connection failed'));
    
      const repo = new EVStationsRepository();
      await expect(repo.batchInsertStations([mockStationInput])).rejects.toThrow('DB connection failed');
    
      consoleErrorSpy.mockRestore();
    });
  });
});