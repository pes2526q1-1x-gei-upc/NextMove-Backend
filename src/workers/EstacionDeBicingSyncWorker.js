import 'dotenv/config';
import fetch from 'node-fetch';
// Asegúrate de que esta ruta a tu repositorio es correcta
import EstacionDeBicingRepository from '../repositories/estacionDeBicingRepository.js';

// URLs y token
const INFO_URL = "https://opendata-ajuntament.barcelona.cat/data/dataset/bd2462df-6e1e-4e37-8205-a4b8e7313b84/resource/f60e9291-5aaa-417d-9b91-612a9de800aa/download"; 
const ESTADO_URL = "https://opendata-ajuntament.barcelona.cat/data/dataset/6aa3416d-ce1a-494d-861b-7bd07f069600/resource/1b215493-9e63-4a12-8980-2d7e0fa19f85/download";
const TOKEN_DE_ACCESO_API = process.env.TOKEN_DE_ACCESO;

const configPeticion = {
  method: 'GET',
  headers: {
    'Authorization': TOKEN_DE_ACCESO_API
  }
};

function calcularEstadoEstacion(estacionEstado) {
  const isRenting = estacionEstado.is_renting === 1;
  const isReturning = estacionEstado.is_returning === 1;

  if (isRenting && isReturning) return "OPERATIVA";
  else if (isRenting && !isReturning) return "SOLO_ALQUILER";
  else if (!isRenting && isReturning) return "SOLO_ANCLAJE";
  else return "FUERA_DE_SERVICIO";
}

function calcularPlazasOcupadas(anclajesDisponibles, plazasTotales) {
  return plazasTotales - anclajesDisponibles;
}

class BicingSyncWorker {
  constructor() {
    this.repo = new EstacionDeBicingRepository();

    this.isRunning = false;
    this.dynamicTimer = null;
    this.staticTimer = null;

    this.DYNAMIC_SYNC_INTERVAL = 5 * 60 * 1000;       // 5 minutos
    this.STATIC_SYNC_INTERVAL = 24 * 60 * 60 * 1000;  // 24 horas

    this.estacionesCache = [];

    this.stats = {
      totalSyncs: 0,
      lastSyncTime: null,
      lastSyncSuccess: null,
      consecutiveFailures: 0
    };
  }

  getEstacionesCache() {
    // Log de las estaciones cacheadas (Paso 3)
    console.log(`EstacionDeBicingSyncWorker: Estaciones actualmente en caché: ${this.estacionesCache.length}`);
    return this.estacionesCache;
  }

  // MÉTODO CLAVE PARA SINCRONIZACIÓN MASIVA Y GUARDADO EN LA BD
  async syncDatosEstaticosMasivo() {
    try {
      console.log("EstacionDeBicingSyncWorker: Iniciando sincronización masiva de estaciones estáticas...");
      const response = await fetch(INFO_URL, configPeticion);
                       
      const staticDataRaw = await response.json();
            
      // 2. CORRECCIÓN DEL ERROR: Asegurarse de que tenemos un Array antes de hacer .map()
      // Buscamos en data.stations o asumimos que staticDataRaw es el array.
      let rawStations = [];
            
      if (Array.isArray(staticDataRaw?.data?.stations)) {
        rawStations = staticDataRaw.data.stations;
      } else if (Array.isArray(staticDataRaw)) {
        rawStations = staticDataRaw;
      } 
            
      // Log de las estaciones estáticas (Paso 1)
      console.log(`EstacionDeBicingSyncWorker (MASIVO): Estaciones estáticas obtenidas de la API: ${rawStations.length}`);

      if (rawStations.length === 0) {
        console.log("EstacionDeBicingSyncWorker (MASIVO): No se encontraron estaciones válidas para sincronizar. Saltando inserción en BD.");
        return;
      }

      // 3. Mapeamos/Transformamos los datos de la API al formato que espera el repositorio para la BD.
      const staticData = rawStations.map(e => ({
        id: e.station_id,
        nombre: e.name,
        direccion: e.address,
        plazasTotales: e.capacity,
        coordenadas: { latitude: e.lat, longitude: e.lon },
        estacionCargaElectrica: (e.physical_configuration === "ELECTRICBIKESTATION") || (e.is_charging_station === true)
      }));



      // 4. LLAMADA CRÍTICA A LA BD: Invocamos al método de sincronizar estaciones de bicing masivamente. 
      await this.repo.sincronizarEstacionesDeBicingMasivamente(staticData);
            
      // 5. Refrescar la caché interna después de la BD
      await this.refrescarCacheFusionada();
      console.log(`EstacionDeBicingSyncWorker (MASIVO): Sincronización masiva completada. ${staticData.length} estaciones sincronizadas.`);
    } catch (error) {
      console.error("EstacionDeBicingSyncWorker (MASIVO): Error en sincronización masiva:", error.message);
    }
  }

  // Refresco dinámico solo cache con datos dinámicos de la API
  async syncDatosDinamicos() {
    try {
      console.log("EstacionDeBicingSyncWorker (Dinámico): Actualizando datos dinámicos...");
      await this.refrescarCacheFusionada();
      console.log("EstacionDeBicingSyncWorker (Dinámico): Refresco dinámico completado.");
    } catch (error) {
      console.error("EstacionDeBicingSyncWorker (Dinámico): Error en refresco dinámico:", error.message);
    }
  }

  // Fusiona datos estáticos de BD + dinámicos de API y los guarda en cache interna
  async refrescarCacheFusionada() {
    try {
      // Obtener datos estáticos de la BD
      const datosEstaticos = await this.repo.getAllEstacionesDeBicing();
      console.log(`EstacionDeBicingSyncWorker (Fusión): Estaciones estáticas cargadas de la BD (base para la fusión): ${datosEstaticos.length}`);
            
      // Obtener datos dinámicos de la API
      const response = await fetch(ESTADO_URL, configPeticion);
      const dynamicRaw = await response.json();
            
      // Accedemos a la lista de estaciones dinámicas DE FORMA SEGURA, buscando en .data.stations
      let datosDinamicos = [];
      if (dynamicRaw && dynamicRaw.data && Array.isArray(dynamicRaw.data.stations)) {
        datosDinamicos = dynamicRaw.data.stations;
      } else if (Array.isArray(dynamicRaw)) {
        datosDinamicos = dynamicRaw;
      } else {
        datosDinamicos = [];
      }
            
      // Log de las estaciones dinámicas (Paso 2)
      console.log(`EstacionDeBicingSyncWorker (Dinámico): Estaciones dinámicas obtenidas de la API: ${datosDinamicos.length}`);
            
      // Fusión de estaciones (datos estáticos de BD + datos dinámicos de la API)
      this.estacionesCache = datosEstaticos.map(estacion => {
        const dyn = datosDinamicos.find(e => e.station_id.toString() === estacion.id.toString());
        let fusion = { ...estacion };
        if (dyn) {
          const types = dyn.num_bikes_available_types || {};
          fusion = {
            ...fusion,
            sePuedenAlquilarBicis: dyn.is_renting === 1,
            sePuedeAnclarBicis: dyn.is_returning === 1,
            anclajesDisponibles: dyn.num_docks_available,
            plazasOcupadas: estacion.plazasTotales !== null ? calcularPlazasOcupadas(dyn.num_docks_available, estacion.plazasTotales) : 0,
            bicisMecanicasDisponibles: types.mechanical,
            bicisElectricasDisponibles: types.ebike,
            estado: calcularEstadoEstacion(dyn)
          };
        }
        //
        return fusion;
      });
            
      // Log de las estaciones cacheadas después de la fusión
      console.log(`EstacionDeBicingSyncWorker (Fusión) Caché interna actualizada: ${this.estacionesCache.length} estaciones fusionadas y listas.`);
            
      this.stats.totalSyncs++;
      this.stats.lastSyncTime = new Date();
      this.stats.lastSyncSuccess = true;
      this.stats.consecutiveFailures = 0;
    } catch (error) {
      this.stats.lastSyncTime = new Date();
      this.stats.lastSyncSuccess = false;
      this.stats.consecutiveFailures++;
      console.error("EstacionDeBicingSyncWorker (Fusión): Error refrescando cache:", error.message);
    }
  }

  start() {
    if (this.isRunning) {
      console.log("EstacionDeBicingSyncWorker: Ya está en ejecución.");
      return;
    }
    this.isRunning = true;
    console.log("EstacionDeBicingSyncWorker: Worker iniciado.");

    this.ejecutarCicloEstatico();
    this.ejecutarCicloDinamico();
  }

  stop() {
    if (!this.isRunning) return;
    clearTimeout(this.staticTimer);
    clearTimeout(this.dynamicTimer);
    this.isRunning = false;
    console.log("EstacionDeBicingSyncWorke: Worker detenido.");
  }

  // Ciclo recursivo 24h para sincronización masiva
  ejecutarCicloEstatico() {
    if (!this.isRunning) return;
    this.syncDatosEstaticosMasivo()
      .finally(() => {
        this.staticTimer = setTimeout(() => this.ejecutarCicloEstatico(), this.STATIC_SYNC_INTERVAL);
      });
  }

  // Ciclo recursivo 5min para actualización dinámica
  ejecutarCicloDinamico() {
    if (!this.isRunning) return;
    this.syncDatosDinamicos()
      .finally(() => {
        this.dynamicTimer = setTimeout(() => this.ejecutarCicloDinamico(), this.DYNAMIC_SYNC_INTERVAL);
      });
  }
}

// Exporta singleton
const EstacionDeBicingSyncWorker = new BicingSyncWorker();
export default EstacionDeBicingSyncWorker;