import { mapRepositoryToGraphQL, extractDynamicData, mapICAENToRepository } from '../src/utils/EVStationsMapper.js';

describe('EVStationsMapper', () => {
  
  // ==================== mapRepositoryToGraphQL ====================
  describe('mapRepositoryToGraphQL', () => {
    const mockDbStation = {
      id: 0,
      external_id: 'ES/ENX/123',
      name: 'Test Station',
      address: 'Test Address',
      city: 'Barcelona',
      longitude: 2.1734,
      latitude: 41.3851,
      ccs_power_kw: 50,
      chademo_power_kw: 50,
      mennekes_power_kw: 22,
      schuko_power_kw: 3.7,
      distance: 1.5
    };

    test('mapea correctamente estación sin datos dinámicos', () => {
      const result = mapRepositoryToGraphQL(mockDbStation, null);

      expect(result.id).toBe(0);
      expect(result.externalId).toBe('ES/ENX/123');
      expect(result.name).toBe('Test Station');
      expect(result.coordinates).toEqual({ longitude: 2.1734, latitude: 41.3851 });
      expect(result.connectors).toHaveLength(4);
      expect(result.connectors[0]).toEqual({
        type: 'CCS',
        powerKw: 50,
        status: 'UNAVAILABLE',
        statusCode: '-'
      });
      expect(result.accessType).toBeNull();
      expect(result.isSuperFast).toBe(false);
      expect(result.lastUpdated).toBeNull();
    });

    test('mapea correctamente con datos dinámicos', () => {
      const dynamicData = {
        connectors: [
          { type: 'CCS', status: 'AVAILABLE', statusCode: '1' },
          { type: 'MENNEKES', status: 'OCCUPIED', statusCode: '0' }
        ],
        accessType: 'VIA PUBLICA',
        isSuperFast: true,
        lastUpdated: '2025-11-20T10:00:00Z'
      };

      const result = mapRepositoryToGraphQL(mockDbStation, dynamicData);

      expect(result.connectors[0]).toEqual({
        type: 'CCS',
        powerKw: 50,
        status: 'AVAILABLE',
        statusCode: '1'
      });
      expect(result.connectors[2]).toEqual({
        type: 'MENNEKES',
        powerKw: 22,
        status: 'OCCUPIED',
        statusCode: '0'
      });
      expect(result.accessType).toBe('VIA PUBLICA');
      expect(result.isSuperFast).toBe(true);
      expect(result.lastUpdated).toBe('2025-11-20T10:00:00Z');
    });

    test('maneja estación sin conectores', () => {
      const stationNoConnectors = { ...mockDbStation };
      delete stationNoConnectors.ccs_power_kw;
      delete stationNoConnectors.chademo_power_kw;
      delete stationNoConnectors.mennekes_power_kw;
      delete stationNoConnectors.schuko_power_kw;

      const result = mapRepositoryToGraphQL(stationNoConnectors, null);

      expect(result.connectors).toHaveLength(0);
    });
  });

  // ==================== extractDynamicData ====================
  describe('extractDynamicData', () => {
    test('extrae datos dinámicos correctamente de feature ICAEN', () => {
      const icaenFeature = {
        properties: {
          estatccs: '1',
          tempsccs: '30',
          estatcha: '0',
          tempscha: '60',
          estatmnk1: '1',
          tempsmnk1: '45',
          data: '2025-11-20T10:00:00Z',
          tipus_acces: 'VIA PUBLICA',
          superrapid: '1'
        }
      };

      const result = extractDynamicData(icaenFeature);

      expect(result.connectors).toHaveLength(3);
      expect(result.connectors[0]).toEqual({
        type: 'CCS',
        status: 'AVAILABLE',
        statusCode: '1',
        chargingTime: 30
      });
      expect(result.connectors[1]).toEqual({
        type: 'CHADEMO',
        status: 'OCCUPIED',
        statusCode: '0',
        chargingTime: 60
      });
      expect(result.accessType).toBe('VIA PUBLICA');
      expect(result.isSuperFast).toBe(true);
      expect(result.lastUpdated).toBe('2025-11-20T10:00:00Z');
    });

    test('ignora conectores con estado "-"', () => {
      const icaenFeature = {
        properties: {
          estatccs: '-',
          estatcha: '1',
          tempscha: '30',
          data: '2025-11-20T10:00:00Z',
          tipus_acces: 'APARCAMENT',
          superrapid: '0'
        }
      };

      const result = extractDynamicData(icaenFeature);

      expect(result.connectors).toHaveLength(1);
      expect(result.connectors[0].type).toBe('CHADEMO');
      expect(result.isSuperFast).toBe(false);
    });

    test('maneja feature sin conectores disponibles', () => {
      const icaenFeature = {
        properties: {
          estatccs: '-',
          estatcha: '-',
          estatmnk1: '-',
          data: '2025-11-20T10:00:00Z'
        }
      };

      const result = extractDynamicData(icaenFeature);

      expect(result.connectors).toHaveLength(0);
    });
  });

  // ==================== mapICAENToRepository ====================
  describe('mapICAENToRepository', () => {
    test('mapea feature ICAEN a formato de repositorio', () => {
      const icaenFeature = {
        properties: {
          id: 'ES/ENX/123',
          nom: 'Estació Barcelona',
          carrer: 'Carrer Provença',
          ciutat: 'Barcelona',
          potenciaccs: '50',
          estatccs: '1',
          potenciacha: '50',
          estatcha: '1',
          potenciamnk1: '22',
          estatmnk1: '1',
          shucko: '1'
        },
        geometry: {
          coordinates: [2.1734, 41.3851]
        }
      };

      const result = mapICAENToRepository(icaenFeature);

      expect(result.id).toBe('ES/ENX/123');
      expect(result.name).toBe('Estació Barcelona');
      expect(result.address).toBe('Carrer Provença');
      expect(result.city).toBe('Barcelona');
      expect(result.longitude).toBe(2.1734);
      expect(result.latitude).toBe(41.3851);
      expect(result.ccs_power_kw).toBe(50);
      expect(result.chademo_power_kw).toBe(50);
      expect(result.mennekes_power_kw).toBe(22);
      expect(result.schuko_power_kw).toBe(3.7);
    });

    test('usa fallback de nombre si no tiene nom', () => {
      const icaenFeature = {
        properties: {
          id: 'ES/ENX/123',
          nom: null
        },
        geometry: {
          coordinates: [2.1734, 41.3851]
        }
      };

      const result = mapICAENToRepository(icaenFeature);

      expect(result.name).toBe('ES/ENX/123');
    });

    test('infiere potencia de superrapid si no hay potencia explícita', () => {
      const icaenFeature = {
        properties: {
          id: 'ES/ENX/123',
          nom: 'Test',
          potenciaccs: '0',
          estatccs: '1',
          superrapid: '2'
        },
        geometry: {
          coordinates: [2.1734, 41.3851]
        }
      };

      const result = mapICAENToRepository(icaenFeature);

      expect(result.ccs_power_kw).toBe(150); // superrapid '2' → 150kW
    });
  });
});