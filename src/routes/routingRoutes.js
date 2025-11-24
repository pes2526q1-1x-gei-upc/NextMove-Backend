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