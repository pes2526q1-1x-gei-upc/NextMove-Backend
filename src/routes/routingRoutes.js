// src/routes/routingRoutes.js
import express from 'express';
import rateLimit from 'express-rate-limit';
import googleMapsService from '../services/googleMapsService.js';

const router = express.Router();

const routesLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: {
    success: false,
    error: 'Demasiadas peticiones. Por favor, intenta de nuevo más tarde.'
  }
});

router.use(routesLimiter);

/**
 * @swagger
 * /api/routing/routes:
 *   post:
 *     summary: Calcula una ruta entre dos ubicaciones
 *     description: |
 *       Calcula una o varias rutas entre dos puntos usando Google Routes API.
 *       Devuelve la ruta recomendada (priorizando opciones eco-friendly) y rutas alternativas.
 *       
 *       **Notas importantes:**
 *       - Para BICYCLE y WALK solo se devuelve 1 ruta (no hay alternativas)
 *       - routingPreference solo funciona con DRIVE y TWO_WHEELER
 *       - El polyline devuelto debe decodificarse para pintarlo en el mapa
 *     tags: [Routing]
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
 *       400:
 *         description: Error en los parámetros de entrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               missingParams:
 *                 summary: Faltan parámetros
 *                 value:
 *                   success: false
 *                   error: Se requieren origen y destino
 *               invalidCoords:
 *                 summary: Coordenadas inválidas
 *                 value:
 *                   success: false
 *                   error: Coordenadas fuera de rango válido
 *       429:
 *         description: Demasiadas peticiones (rate limit excedido)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               error: Demasiadas peticiones. Por favor, intenta de nuevo más tarde.
 *       500:
 *         description: Error del servidor o de Google Routes API
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/routes', async (req, res) => {
  try {
    const { origin, destination, preferences } = req.body;

    if (!origin || !destination) {
      return res.status(400).json({
        success: false,
        error: 'Se requieren origen y destino'
      });
    }

    // Aceptar tanto {lat, lng} como {latitude, longitude}
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
        error: 'Formato de coordenadas inválido. Se espera {latitude: number, longitude: number} o {lat: number, lng: number}'
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
 *     summary: Convierte una dirección en coordenadas (Geocoding)
 *     description: |
 *       Busca una ubicación a partir de una dirección en texto y devuelve sus coordenadas GPS.
 *       Útil para búsquedas de destinos, autocompletar direcciones, etc.
 *       
 *       **Ejemplos de búsquedas válidas:**
 *       - "Plaça Independència, Girona"
 *       - "Sagrada Família, Barcelona"
 *       - "Carrer Major 15, Girona"
 *       - "17001" (código postal)
 *     tags: [Geocoding]
 *     parameters:
 *       - in: query
 *         name: address
 *         required: true
 *         schema:
 *           type: string
 *         description: Dirección a buscar
 *         example: Plaça de la Independència, Girona
 *     responses:
 *       200:
 *         description: Ubicaciones encontradas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LocationResponse'
 *       400:
 *         description: Falta el parámetro address
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Error del servidor o de Google Geocoding API
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/geocode', async (req, res) => {
  try {
    const { address } = req.query;

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
 *     summary: Convierte coordenadas en una dirección (Reverse Geocoding)
 *     description: |
 *       Obtiene la dirección más cercana a unas coordenadas GPS.
 *       Útil para mostrar la dirección cuando el usuario hace clic en el mapa.
 *     tags: [Geocoding]
 *     parameters:
 *       - in: query
 *         name: latitude
 *         required: false
 *         schema:
 *           type: number
 *           format: double
 *         description: Latitud (también acepta "lat")
 *         example: 41.9794
 *       - in: query
 *         name: longitude
 *         required: false
 *         schema:
 *           type: number
 *           format: double
 *         description: Longitud (también acepta "lng")
 *         example: 2.8214
 *       - in: query
 *         name: lat
 *         required: false
 *         schema:
 *           type: number
 *           format: double
 *         description: Latitud (forma abreviada)
 *       - in: query
 *         name: lng
 *         required: false
 *         schema:
 *           type: number
 *           format: double
 *         description: Longitud (forma abreviada)
 *     responses:
 *       200:
 *         description: Dirección encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReverseGeocodeResponse'
 *       400:
 *         description: Faltan coordenadas o son inválidas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Error del servidor o de Google Geocoding API
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/reverse-geocode', async (req, res) => {
  try {
    const { lat, latitude, lng, longitude } = req.query;

    const finalLat = latitude || lat;
    const finalLng = longitude || lng;

    if (!finalLat || !finalLng) {
      return res.status(400).json({
        success: false,
        error: 'Se requieren parámetros "latitude" y "longitude" (o "lat" y "lng")'
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