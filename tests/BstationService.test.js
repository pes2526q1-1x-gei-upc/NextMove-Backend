/**import { jest } from '@jest/globals';
global.fetch = jest.fn();
import { getEstacionesFusionadas } from '../src/services/EstacionBicingService.js';



test('getEstacionesFusionadas returns mocked stations', async () => {
  fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ data: { stations: [{ "station_id": 1,
      "name": "GRAN VIA CORTS CATALANES, 760",
      "physical_configuration": "ELECTRICBIKESTATION",
      "lat": 41.3979779,
      "lon": 2.1801069,
      "altitude": 16.0,
      "address": "GRAN VIA CORTS CATALANES, 760",
      "cross_street": "02-Eixample/05-el Fort Pienc",
      "post_code": "08013",
      "capacity": 46,
      "is_charging_station": true,
      "short_name": 1,
      "nearby_distance": 1000.0,
      "_ride_code_support": true,
      "rental_uris": null }] } }),
  }).mockResolvedValueOnce({
    ok: true,
    json: async () => ({ data: { stations: [{ "station_id": 1,
      "num_bikes_available": 7,
      "num_bikes_available_types": {
        "mechanical": 7,
        "ebike": 0
      },
      "num_docks_available": 30,
      "last_reported": 1761386189,
      "is_charging_station": true,
      "status": "IN_SERVICE",
      "is_installed": 1,
      "is_renting": 1,
      "is_returning": 1,
      "traffic": null }] } }),
  });

  const estaciones = await getEstacionesFusionadas();
  expect(estaciones).toEqual([{"id": 1,
    "nombre": "GRAN VIA CORTS CATALANES, 760",
    "direccion": "GRAN VIA CORTS CATALANES, 760",
    "coordenadas": {
      "lat": 41.3979779,
      "lon": 2.1801069
    },
    "plazasTotales": 46,
    "estacionCargaElectrica": true,
    "sePuedenAlquilarBicis": true,
    "sePuedeAnclarBicis": true,
    "anclajesDisponibles": 30,
    "plazasOcupadas": 16,
    "bicisMecanicasDisponibles": 7,
    "bicisElectricasDisponibles": 0,
    "estado": "OPERATIVA"
  }]);
});*/