import express from 'express';
import rateLimit from 'express-rate-limit';
import googleMapsService from '../services/googleMapsService.js';
import { requireApiKey } from '../middleware/auth.js';

const router = express.Router();

const companyRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: async (req) => {
    return req.company?.rateLimitPerHour || 100;
  },
  keyGenerator: (req) => {
    return `company_${req.company.id}`;
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: `Límite de ${req.company.rateLimitPerHour} peticiones por hora excedido para ${req.company.companyName}`
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Aplicar autenticación con API Key a todas las rutas
router.use(requireApiKey);
router.use(companyRateLimiter);

/**
 * @swagger
 * /api/routing/routes:
 *   post:
 *     summary: Calcula una ruta entre dos ubicaciones
 *     description: |
 *       **Requiere API Key de empresa**
 *       Incluye el header `X-API-Key` con tu clave de acceso.
 *       
 *       Notas importantes:
 *       - Para BICYCLE y WALK solo se devuelve 1 ruta
 *       - routingPreference solo funciona con DRIVE y TWO_WHEELER
 *     tags: [Routing]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RouteRequest'
 *     responses:
 *       200:
 *         description: Rutas calculadas correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RouteResponse'
 *       401:
 *         description: API key faltante o inválida
 *       429:
 *         description: Límite de peticiones excedido
 *       500:
 *         description: Error del servidor
 */
router.post('/routes', async (req, res) => {
  try {
    const { origin, destination, preferences } = req.body;

    // Log de uso por empresa
    console.log(`[${new Date().toISOString()}] Route request from ${req.company.companyName} (${req.company.totalRequests} total requests)`);

    if (!origin || !destination) {
      return res.status(400).json({
        success: false,
        error: 'Se requieren origen y destino'
      });
    }

    const originCoords = {
      latitude: origin.latitude || origin.lat,
      longitude: origin.longitude || origin.lng
    };

    const destCoords = {
      latitude: destination.latitude || destination.lat,
      longitude: destination.longitude || destination.lng
    };

    if (!originCoords.latitude || !originCoords.longitude || 
        !destCoords.latitude || !destCoords.longitude) {
      return res.status(400).json({
        success: false,
        error: 'Formato de coordenadas inválido. Se espera {latitude: number, longitude: number}'
      });
    }

    if (Math.abs(originCoords.latitude) > 90 || Math.abs(originCoords.longitude) > 180 ||
        Math.abs(destCoords.latitude) > 90 || Math.abs(destCoords.longitude) > 180) {
      return res.status(400).json({
        success: false,
        error: 'Coordenadas fuera de rango válido'
      });
    }

    const routes = await googleMapsService.computeRoute(
      originCoords,
      destCoords,
      {
        travelMode: preferences?.travelMode || 'DRIVE',
        routingPreference: preferences?.routingPreference || 'TRAFFIC_AWARE_OPTIMAL',
        computeAlternatives: true,
        avoidTolls: preferences?.avoidTolls || false,
        avoidHighways: preferences?.avoidHighways || false,
        avoidFerries: preferences?.avoidFerries || false
      }
    );

    const sortedRoutes = routes.sort((a, b) => {
      if (a.isEcoFriendly && !b.isEcoFriendly) return -1;
      if (!a.isEcoFriendly && b.isEcoFriendly) return 1;
      return a.distanceMeters - b.distanceMeters;
    });

    res.json({
      success: true,
      data: {
        routes: sortedRoutes,
        recommendedRoute: sortedRoutes[0],
        alternativeRoutesCount: sortedRoutes.length - 1,
        ecoFriendlyOptionsCount: sortedRoutes.filter(r => r.isEcoFriendly).length
      }
    });
  } catch (error) {
    console.error('Routes API error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/routing/geocode:
 *   get:
 *     summary: Convierte una dirección en coordenadas
 *     description: Requiere API Key de empresa
 *     tags: [Geocoding]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: address
 *         required: true
 *         schema:
 *           type: string
 *         example: Plaça de la Independència, Girona
 *     responses:
 *       200:
 *         description: Ubicaciones encontradas
 *       401:
 *         description: API key inválida
 */
router.get('/geocode', async (req, res) => {
  try {
    const { address } = req.query;

    console.log(`[${new Date().toISOString()}] Geocode request from ${req.company.companyName}`);

    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere parámetro "address"'
      });
    }

    const results = await googleMapsService.geocode(address);

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Geocoding error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/routing/routes:
 *   post:
 *     summary: Calcula una ruta entre dos ubicaciones
 *     description: |
 *       **Requiere API Key de empresa**
 *       
 *       Calcula una o varias rutas entre dos puntos usando Google Routes API.
 *       Devuelve la ruta recomendada (priorizando opciones eco-friendly) y rutas alternativas.
 *       
 *       **Autenticación:**
 *       - Incluye el header `X-API-Key` con tu clave de acceso
 *       - Cada empresa tiene un límite personalizado de peticiones por hora
 *       - El límite se resetea cada hora
 *       
 *       **Notas importantes:**
 *       - Para BICYCLE y WALK solo se devuelve 1 ruta (no hay rutas alternativas)
 *       - routingPreference solo funciona con DRIVE y TWO_WHEELER
 *       - El polyline devuelto debe decodificarse para pintarlo en el mapa
 *       - Las rutas se ordenan priorizando eco-friendly y luego por distancia más corta
 *     tags: [Routing]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RouteRequest'
 *           examples:
 *             gironaBarcelona:
 *               summary: Ruta Girona a Barcelona en coche
 *               value:
 *                 origin:
 *                   latitude: 41.9794
 *                   longitude: 2.8214
 *                 destination:
 *                   latitude: 41.3851
 *                   longitude: 2.1734
 *                 preferences:
 *                   travelMode: DRIVE
 *                   routingPreference: TRAFFIC_AWARE_OPTIMAL
 *                   avoidTolls: false
 *             bicycleRoute:
 *               summary: Ruta en bicicleta (corta distancia)
 *               value:
 *                 origin:
 *                   latitude: 41.9794
 *                   longitude: 2.8214
 *                 destination:
 *                   latitude: 41.9810
 *                   longitude: 2.8220
 *                 preferences:
 *                   travelMode: BICYCLE
 *             avoidTolls:
 *               summary: Ruta evitando peajes y autopistas
 *               value:
 *                 origin:
 *                   latitude: 41.9794
 *                   longitude: 2.8214
 *                 destination:
 *                   latitude: 41.3851
 *                   longitude: 2.1734
 *                 preferences:
 *                   travelMode: DRIVE
 *                   avoidTolls: true
 *                   avoidHighways: true
 *     responses:
 *       200:
 *         description: Rutas calculadas correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RouteResponse'
 *             example:
 *               success: true
 *               data:
 *                 routes:
 *                   - distance: "103.2 km"
 *                     distanceMeters: 103218
 *                     duration: "1h 31min"
 *                     durationSeconds: 5470
 *                     polyline: "encodedPolylineString..."
 *                     isEcoFriendly: true
 *                     routeLabels: ["ECO_FRIENDLY"]
 *                     travelAdvisory:
 *                       hasTollRoads: true
 *                       estimatedTollPrice: "5.50 EUR"
 *                     startLocation:
 *                       latitude: 41.9794
 *                       longitude: 2.8214
 *                     endLocation:
 *                       latitude: 41.3851
 *                       longitude: 2.1734
 *                 recommendedRoute:
 *                   distance: "103.2 km"
 *                   distanceMeters: 103218
 *                   duration: "1h 31min"
 *                   durationSeconds: 5470
 *                   isEcoFriendly: true
 *                 alternativeRoutesCount: 2
 *                 ecoFriendlyOptionsCount: 1
 *       400:
 *         description: Error en los parámetros de entrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               missingParams:
 *                 summary: Faltan parámetros requeridos
 *                 value:
 *                   success: false
 *                   error: Se requieren origen y destino
 *               invalidFormat:
 *                 summary: Formato de coordenadas inválido
 *                 value:
 *                   success: false
 *                   error: "Formato de coordenadas inválido. Se espera {latitude: number, longitude: number}"
 *               invalidRange:
 *                 summary: Coordenadas fuera de rango
 *                 value:
 *                   success: false
 *                   error: Coordenadas fuera de rango válido
 *       401:
 *         description: API key faltante o inválida
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               missingKey:
 *                 summary: API key no proporcionada
 *                 value:
 *                   success: false
 *                   error: API key requerida
 *               invalidKey:
 *                 summary: API key inválida
 *                 value:
 *                   success: false
 *                   error: API key inválida
 *       429:
 *         description: Límite de peticiones excedido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               error: Límite de 100 peticiones por hora excedido para Tu Empresa SL
 *       500:
 *         description: Error del servidor o de Google Routes API
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               error: Error al calcular la ruta
 */
router.get('/reverse-geocode', async (req, res) => {
  try {
    const { lat, latitude, lng, longitude } = req.query;

    console.log(`[${new Date().toISOString()}] Reverse geocode request from ${req.company.companyName}`);

    const finalLat = latitude || lat;
    const finalLng = longitude || lng;

    if (!finalLat || !finalLng) {
      return res.status(400).json({
        success: false,
        error: 'Se requieren parámetros "latitude" y "longitude"'
      });
    }

    const parsedLat = parseFloat(finalLat);
    const parsedLng = parseFloat(finalLng);

    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      return res.status(400).json({
        success: false,
        error: 'Coordenadas inválidas'
      });
    }

    const address = await googleMapsService.reverseGeocode(parsedLat, parsedLng);

    res.json({
      success: true,
      data: {
        address,
        coordinates: {
          latitude: parsedLat,
          longitude: parsedLng
        }
      }
    });
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;