import { getEstacionesFusionadas } from '../services/EstacionBicinigService.js';

/** 
 * Worker que en segundo plano sincroniza hace fetch a la API de Bicing y actualiza las estaciones en la base de datos
 * Para ello haremos uso del patrón recursivo de setTimeout para así poder evitar el solapamiento de llamadas que podría ocurrir con setInterval
 */

class BicingSyncWorker {
    constructor() {
        this.timeoutId = null; //referencia al timeout activo
        this.isRunning = false; 
        //definimos el intervalo de tiempo entre sincronizaciones (5 minutos)
        this.syncInterval = 5*60*1000; 

        //variable usada para almacenar los datos en memoria de la aplicación: 
        this.estacionesCache = []; 

        //estadísticas para monitorizar el worker
        this.stats = {
            totalSyncs: 0, 
            lastSyncTime: null, 
            lastSyncSuccess: null, 
            consecutiveDFailures: 0
        }; 
    }

    //Método que expone la caché al resto de la app para consumirla: 
    getEstacionesCache() {
        return this.estacionesCache; 
    }

    //método para inciar el worker
    start() {
        if(this.isRunning) {
            console.log("EstacionDeBicingSyncWorker ya está en ejecución"); 
            return; 
        }
        //en este caso iniciamos el worker
        console.log("Iniciando EstacionDeBicingSyncWorker...");
        this.isRunning = true; 
        //iniciamos el ciclo de ejecución recursivo
        this.executeSyncCycle(); 
        console.log("Sync worker iniciado de forma satisfactoria.");
    }

    //método para parar el worker: 
    stop() {
        if(!this.isRunning) return; 
        if(this.timeoutId) clearTimeout(this.timeoutId);
        this.timeoutId = null; 
        this.isRunning = false; 
        
        console.log("EstacionDeBicingSyncWorker detenido.");
    }

    //método que realiza la sincronización de estaciones
    async syncEstaciones() {
        const startTime = Date.now(); 
        const startTimeString = startTime.toLocaleString('es-ES');
        console.log("Iniciando sincronización de estaciones de Bicing: " + startTimeString + "\n");

        try {
            //llamamos al servicio para obtener los datos de la API y actualizar la base de datos
            const estacionesBicing = await getEstacionesFusionadas(); 
            //verificamos que hemos obtenido datos
            if(!estacionesBicing || estacionesBicing.length === 0) throw new Error("No se han obtenido datos de estaciones de Bicing.");  
            //caso frucutoso ==> actualizamos la caché
            this.estacionesCache = estacionesBicing ; 

            console.log("DENTRO DEL WORKER DE BICING: ESTACIONES OBTENIDAS: " + estacionesBicing.length);

            const duracion = Date.now() - startTime; 
            console.log(`Sincronización completada con éxito en ${duracion} ms. Estaciones obtenidas: ${estacionesBicing.length}\n`);
            //actualizamos las estadísticas del worker
            this.stats.totalSyncs++;
            this.stats.lastSyncTime = new Date();
            this.stats.lastSyncSuccess = true;
            this.stats.consecutiveDFailures = 0; //reseteamos el contador de fallos consecutivos
        } catch (error) {
            this.stats.lastSyncTime = new Date(); 
            this.stats.lastSyncSuccess = false; 
            this.stats.consecutiveDFailures++;
            
            const duracion_fallo = Date.now() - startTime;
            console.error(`Error durante la sincronización de estaciones de Bicing tras ${duracion_fallo} ms: ${error.message}\n`);
    }
}

    //Función recursiva que ejecuta el ciclo de sincronización:
    async executeSyncCycle() {
        //miramos si el worker sigue en ejecución
        if(!this.isRunning) return;

        //worker en ejecución, procedemos a esperar que el fetch termine: 
        await this.syncEstaciones(); 

        //programamos la siguiente ejecución del ciclo tras el intervalo definido
        this.timeoutId = setTimeout(() => {
            this.executeSyncCycle();  //llamda recursiva. 
        }, this.syncInterval); 

        const nextSyncTime = new Date(Date.now() + this.syncInterval).toLocaleString('es-ES');
        const timeNow = new Date().toLocaleString('es-ES');
        console.log(`Siguiente sincronización programada para las ${nextSyncTime} (hora actual: ${timeNow})`);
    }

}
//por último exportamos la instancia singleton del worker para que toda la app use el mismo worker en caso de necesitarlo
const EstacionDeBicingSyncWorker = new BicingSyncWorker();
export default EstacionDeBicingSyncWorker; 