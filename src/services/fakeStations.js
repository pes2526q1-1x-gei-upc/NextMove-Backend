// src/services/bicing.mock.js

// Nos inventamos los datos de la estación "123"
// Fíjate que mezclamos campos de las dos APIs (info y status)

export const fakeStationData = [{
  station_id: "123",
  name: "[MOCK] Estació de Sants",
  address: "Pl. dels Països Catalans (falso)",
  capacity: 40,
  lat: 41.379021,
  lon: 2.139934,
  num_bikes_available: 8,
  num_docks_available: 32,
  last_reported: 1678886400 // Es un timestamp (un número de segundos)
}, 
{ 
  station_id: "124",
  name: "[MOCK] Estació de Gràcia",
  address: "Pg. de Gràcia, 20 (falso)",
  capacity: 30,
  lat: 41.3925,
  lon: 2.1619,
  num_bikes_available: 15,
  num_docks_available: 15,
  last_reported: 1678886400
},{
  station_id: "125",
  name: "[MOCK] Estació de Poblenou",
  address: "Carrer de Bilbao, 10 (falso)",
  capacity: 25,
  lat: 41.4036,
  lon: 2.2024,
  num_bikes_available: 5,
  num_docks_available: 20,
  last_reported: 1678886400
}, 
{
  station_id: "126",
  name: "[MOCK] Estació de Les Corts",
  address: "Carrer de Numància, 50 (falso)",
  capacity: 35,
  lat: 41.3818,
  lon: 2.1228,
  num_bikes_available: 12,
  num_docks_available: 23,
  last_reported: 1678886400
}
]; 
