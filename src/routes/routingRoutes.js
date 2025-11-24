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
 * /api/routing/reverse-geocode:
 *   get:
 *     summary: Convierte coordenadas en una dirección
 *     description: Requiere API Key de empresa
 *     tags: [Geocoding]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: latitude
 *         schema:
 *           type: number
 *         example: 41.9794
 *       - in: query
 *         name: longitude
 *         schema:
 *           type: number
 *         example: 2.8214
 *     responses:
 *       200:
 *         description: Dirección encontrada
 *       401:
 *         description: API key inválida
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