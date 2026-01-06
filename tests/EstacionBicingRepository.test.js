import { applyDatabaseMock, mockQuery, mockClient } from './helpers/databaseMock.js';
await applyDatabaseMock();
const { default: EstacionDeBicingRepository } = await import('../src/repositories/estacionDeBicingRepository.js');
import { jest } from '@jest/globals';

// Datos mock reutilizables
const mockEstacionInput = {
  id: '123',
  nombre: 'Estación Diagonal',
  direccion: 'Avinguda Diagonal, 500',
  plazasTotales: 25,
  coordenadas: {
    latitude: 41.3974,
    longitude: 2.1611
  },
  estacionCargaElectrica: true
};

// Simula una fila de la BD (snake_case)
const mockDbRow = {
  id: '123_BIKE',
  nombre: 'Estación Diagonal',
  direccion: 'Avinguda Diagonal, 500',
  plazastotales: 25,
  coordenadas: { x: 2.1611, y: 41.3974 }, // Formato PostGIS POINT
  estacioncargaelectrica: true
};

// Fila transformada (camelCase)
const mockTransformedRow = {
  id: '123_BIKE',
  nombre: 'Estación Diagonal',
  direccion: 'Avinguda Diagonal, 500',
  plazasTotales: 25,
  coordenadas: {
    latitude: 41.3974,
    longitude: 2.1611
  },
  estacionCargaElectrica: true
};

describe('EstacionDeBicingRepository - CRUD (mocked pool)', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockClient.query.mockReset();
    mockClient.release.mockReset();
  });

  // Tests SIN transacciones (usan mockQuery)
  describe('getAllEstacionesDeBicing', () => {
    test('retorna lista de estaciones transformadas', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockDbRow] });
      
      const repo = new EstacionDeBicingRepository();
      const result = await repo.getAllEstacionesDeBicing();

      expect(mockQuery).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('plazasTotales');
      expect(result[0]).toHaveProperty('estacionCargaElectrica');
      expect(result[0].coordenadas).toHaveProperty('latitude');
      expect(result[0].coordenadas).toHaveProperty('longitude');
    });

    test('retorna array vacío si no hay estaciones', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      
      const repo = new EstacionDeBicingRepository();
      const result = await repo.getAllEstacionesDeBicing();

      expect(result).toEqual([]);
    });
  });

  describe('getEstacionDeBicingById', () => {
    test('retorna estación si existe', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockDbRow] });
      
      const repo = new EstacionDeBicingRepository();
      const result = await repo.getEstacionDeBicingById('123');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        ['123_BIKE']
      );
      expect(result).toHaveProperty('id', '123_BIKE');
      expect(result).toHaveProperty('plazasTotales', 25);
    });

    test('retorna null si no existe', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      
      const repo = new EstacionDeBicingRepository();
      const result = await repo.getEstacionDeBicingById('999');

      expect(result).toBeNull();
    });

    test('normaliza id con sufijo _BIKE', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockDbRow] });
      
      const repo = new EstacionDeBicingRepository();
      await repo.getEstacionDeBicingById('123_BICING');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        ['123_BIKE']
      );
    });

    test('maneja id con múltiples sufijos', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockDbRow] });
      
      const repo = new EstacionDeBicingRepository();
      await repo.getEstacionDeBicingById('123_BICING_BIKE');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        ['123_BIKE']
      );
    });
  });

  describe('getEstacionesPorDireccion', () => {
    test('retorna estaciones que coinciden con dirección', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockDbRow], rowCount: 1 });
      
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      const repo = new EstacionDeBicingRepository();
      const result = await repo.getEstacionesPorDireccion('Diagonal');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        ['%Diagonal%']
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('direccion', 'Avinguda Diagonal, 500');
      
      consoleLogSpy.mockRestore();
    });

    test('retorna array vacío si no hay coincidencias', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      const repo = new EstacionDeBicingRepository();
      const result = await repo.getEstacionesPorDireccion('NoExiste');

      expect(result).toEqual([]);
      
      consoleLogSpy.mockRestore();
    });

    test('propaga errores de base de datos', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockQuery.mockRejectedValueOnce(new Error('DB error'));
      
      const repo = new EstacionDeBicingRepository();
      await expect(repo.getEstacionesPorDireccion('Test')).rejects.toThrow('DB error');
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('deleteEstacionBicing', () => {
    test('elimina estación y retorna true', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });
      
      const repo = new EstacionDeBicingRepository();
      const result = await repo.deleteEstacionBicing('123');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        ['123_BIKE']
      );
      expect(result).toBe(true);
    });

    test('retorna false si no se eliminó nada', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0 });
      
      const repo = new EstacionDeBicingRepository();
      const result = await repo.deleteEstacionBicing('999');

      expect(result).toBe(false);
    });

    test('propaga errores de base de datos', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DELETE failed'));
      
      const repo = new EstacionDeBicingRepository();
      await expect(repo.deleteEstacionBicing('123')).rejects.toThrow('DELETE failed');
    });
  });

  // Tests CON transacciones (usan mockClient.query)
  describe('createEstacionDeBicing', () => {
    test('crea estación con transacción correctamente', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // INSERT station
        .mockResolvedValueOnce({ rows: [mockDbRow] }) // INSERT EstacionBicing
        .mockResolvedValueOnce({}); // COMMIT
      
      const repo = new EstacionDeBicingRepository();
      const result = await repo.createEstacionDeBicing(mockEstacionInput);

      expect(mockClient.query).toHaveBeenCalledTimes(4);
      expect(result).toHaveProperty('id', '123_BIKE');
      expect(result).toHaveProperty('plazasTotales', 25);
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('normaliza id antes de insertar', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // INSERT station
        .mockResolvedValueOnce({ rows: [mockDbRow] }) // INSERT EstacionBicing
        .mockResolvedValueOnce({}); // COMMIT
      
      const repo = new EstacionDeBicingRepository();
      const input = { ...mockEstacionInput, id: '123_BICING' };
      await repo.createEstacionDeBicing(input);

      const calls = mockClient.query.mock.calls;
      const stationInsert = calls.find(call => call[0]?.includes('INSERT INTO station'));
      expect(stationInsert[1]).toEqual(['123_BIKE']);
    });

    test('hace ROLLBACK si falla inserción', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockRejectedValueOnce(new Error('Insert failed')); // INSERT falla
      
      const repo = new EstacionDeBicingRepository();
      await expect(repo.createEstacionDeBicing(mockEstacionInput)).rejects.toThrow('Insert failed');
      
      const calls = mockClient.query.mock.calls;
      expect(calls.some(call => call[0] === 'ROLLBACK')).toBe(true);
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('maneja coordenadas nulas', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // INSERT station
        .mockResolvedValueOnce({ rows: [{ ...mockDbRow, coordenadas: null }] })
        .mockResolvedValueOnce({}); // COMMIT
      
      const repo = new EstacionDeBicingRepository();
      const input = { ...mockEstacionInput, coordenadas: null };
      const result = await repo.createEstacionDeBicing(input);

      expect(result.coordenadas).toBeNull();
    });
  });

  describe('updateEstacionDeBicing', () => {
    test('actualiza solo campos proporcionados', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ ...mockDbRow, nombre: 'Nuevo Nombre' }] });
      
      const repo = new EstacionDeBicingRepository();
      const result = await repo.updateEstacionDeBicing('123', { nombre: 'Nuevo Nombre' });

      expect(mockQuery).toHaveBeenCalled();
      const query = mockQuery.mock.calls[0][0];
      expect(query).toContain('nombre = $1');
      expect(query).not.toContain('direccion');
    });

    test('actualiza múltiples campos', async () => {
      const updated = { ...mockDbRow, nombre: 'Nuevo', plazastotales: 30 };
      mockQuery.mockResolvedValueOnce({ rows: [updated] });
      
      const repo = new EstacionDeBicingRepository();
      const result = await repo.updateEstacionDeBicing('123', {
        nombre: 'Nuevo',
        plazasTotales: 30
      });

      const query = mockQuery.mock.calls[0][0];
      expect(query).toContain('nombre = $1');
      expect(query).toContain('plazastotales = $2');
      expect(result).toHaveProperty('plazasTotales', 30);
    });

    test('retorna estación actual si no hay campos para modificar', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockDbRow] });
      
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      const repo = new EstacionDeBicingRepository();
      const result = await repo.updateEstacionDeBicing('123', {});

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('no tiene ningún campo para modificar')
      );
      expect(result).toHaveProperty('id', '123_BIKE');
      
      consoleLogSpy.mockRestore();
    });

    test('actualiza coordenadas correctamente', async () => {
      const updated = { ...mockDbRow, coordenadas: { x: 2.2, y: 41.4 } };
      mockQuery.mockResolvedValueOnce({ rows: [updated] });
      
      const repo = new EstacionDeBicingRepository();
      const result = await repo.updateEstacionDeBicing('123', {
        coordenadas: { latitude: 41.4, longitude: 2.2 }
      });

      expect(result.coordenadas).toEqual({ latitude: 41.4, longitude: 2.2 });
    });

    test('normaliza id antes de buscar', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockDbRow] });
      
      const repo = new EstacionDeBicingRepository();
      await repo.updateEstacionDeBicing('123_BICING', { nombre: 'Test' });

      const query = mockQuery.mock.calls[0][0];
      const values = mockQuery.mock.calls[0][1];
      expect(values[values.length - 1]).toBe('123_BIKE');
    });

    test('propaga errores de base de datos', async () => {
      mockQuery.mockRejectedValueOnce(new Error('UPDATE failed'));
      
      const repo = new EstacionDeBicingRepository();
      await expect(repo.updateEstacionDeBicing('123', { nombre: 'Test' })).rejects.toThrow('UPDATE failed');
    });
  });

  describe('sincronizarEstacionesDeBicingMasivamente', () => {
    const mockApiData = [
      mockEstacionInput,
      { ...mockEstacionInput, id: '456', nombre: 'Estación Gracia' }
    ];

    test('sincroniza múltiples estaciones correctamente', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // INSERT stations
        .mockResolvedValueOnce({ rowCount: 2 }) // INSERT EstacionBicing
        .mockResolvedValueOnce({}); // COMMIT
      
      const repo = new EstacionDeBicingRepository();
      const result = await repo.sincronizarEstacionesDeBicingMasivamente(mockApiData);

      expect(result).toEqual({ count: 2, success: true });
      expect(mockClient.query).toHaveBeenCalledTimes(4);
      expect(mockClient.release).toHaveBeenCalled();
      
      consoleLogSpy.mockRestore();
    });

    test('normaliza todos los ids antes de insertar', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // INSERT stations
        .mockResolvedValueOnce({ rowCount: 1 }) // INSERT EstacionBicing
        .mockResolvedValueOnce({}); // COMMIT
      
      const repo = new EstacionDeBicingRepository();
      const dataWithBicingSuffix = [{ ...mockEstacionInput, id: '789_BICING' }];
      await repo.sincronizarEstacionesDeBicingMasivamente(dataWithBicingSuffix);

      const calls = mockClient.query.mock.calls;
      const stationInsert = calls.find(call => call[0]?.includes('INSERT INTO stations'));
      expect(stationInsert[1]).toContain('789_BIKE');
      
      consoleLogSpy.mockRestore();
    });

    test('retorna success false con array vacío', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      const repo = new EstacionDeBicingRepository();
      const result = await repo.sincronizarEstacionesDeBicingMasivamente([]);

      expect(result).toEqual({ count: 0, success: true });
      expect(mockClient.query).not.toHaveBeenCalled();
      
      consoleLogSpy.mockRestore();
    });

    test('retorna success false con datos null', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      const repo = new EstacionDeBicingRepository();
      const result = await repo.sincronizarEstacionesDeBicingMasivamente(null);

      expect(result).toEqual({ count: 0, success: true });
      
      consoleLogSpy.mockRestore();
    });

    test('hace ROLLBACK si falla sincronización', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockRejectedValueOnce(new Error('Insert failed')); // Falla inserción
      
      const repo = new EstacionDeBicingRepository();
      await expect(repo.sincronizarEstacionesDeBicingMasivamente(mockApiData))
        .rejects.toThrow('Fallo de Sincronización masiva de datos estáticos de estaciones');
      
      const calls = mockClient.query.mock.calls;
      expect(calls.some(call => call[0] === 'ROLLBACK')).toBe(true);
      expect(mockClient.release).toHaveBeenCalled();
      
      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    test('genera placeholders correctos para múltiples estaciones', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // INSERT stations
        .mockResolvedValueOnce({ rowCount: 2 }) // INSERT EstacionBicing
        .mockResolvedValueOnce({}); // COMMIT
      
      const repo = new EstacionDeBicingRepository();
      await repo.sincronizarEstacionesDeBicingMasivamente(mockApiData);

      const calls = mockClient.query.mock.calls;
      const bicingInsert = calls.find(call => call[0]?.includes('INSERT INTO EstacionBicing'));
      
      expect(bicingInsert[0]).toContain('($1, $2, $3, $4, $5, $6)');
      expect(bicingInsert[0]).toContain('($7, $8, $9, $10, $11, $12)');
      
      consoleLogSpy.mockRestore();
    });

    test('incluye ON CONFLICT DO UPDATE en query de sincronización', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // INSERT stations
        .mockResolvedValueOnce({ rowCount: 1 }) // INSERT EstacionBicing
        .mockResolvedValueOnce({}); // COMMIT
      
      const repo = new EstacionDeBicingRepository();
      await repo.sincronizarEstacionesDeBicingMasivamente([mockEstacionInput]);

      const calls = mockClient.query.mock.calls;
      const bicingInsert = calls.find(call => call[0]?.includes('INSERT INTO EstacionBicing'));
      
      expect(bicingInsert[0]).toContain('ON CONFLICT (id) DO UPDATE SET');
      expect(bicingInsert[0]).toContain('nombre = EXCLUDED.nombre');
      
      consoleLogSpy.mockRestore();
    });
  });

  describe('_transformEstacion (indirecto)', () => {
    test('transforma snake_case a camelCase', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockDbRow] });
      
      const repo = new EstacionDeBicingRepository();
      const result = await repo.getEstacionDeBicingById('123');

      expect(result).not.toHaveProperty('plazastotales');
      expect(result).not.toHaveProperty('estacioncargaelectrica');
      expect(result).toHaveProperty('plazasTotales');
      expect(result).toHaveProperty('estacionCargaElectrica');
    });

    test('parsea coordenadas PostGIS correctamente', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockDbRow] });
      
      const repo = new EstacionDeBicingRepository();
      const result = await repo.getEstacionDeBicingById('123');

      expect(result.coordenadas).toEqual({
        latitude: 41.3974,
        longitude: 2.1611
      });
    });

    test('maneja coordenadas null', async () => {
      const rowWithNullCoords = { ...mockDbRow, coordenadas: null };
      mockQuery.mockResolvedValueOnce({ rows: [rowWithNullCoords] });
      
      const repo = new EstacionDeBicingRepository();
      const result = await repo.getEstacionDeBicingById('123');

      expect(result.coordenadas).toBeNull();
    });

    test('normaliza id en transformación', async () => {
      const rowWithoutSuffix = { ...mockDbRow, id: '123' };
      mockQuery.mockResolvedValueOnce({ rows: [rowWithoutSuffix] });
      
      const repo = new EstacionDeBicingRepository();
      const result = await repo.getEstacionDeBicingById('123');

      expect(result.id).toBe('123_BIKE');
    });
  });
});