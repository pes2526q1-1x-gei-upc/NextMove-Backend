import axios from 'axios';

class GoogleMapsService {
  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY;
    this.routesBaseUrl = 'https://routes.googleapis.com/directions/v2:computeRoutes';
    this.geocodingBaseUrl = 'https://maps.googleapis.com/maps/api/geocode/json';

    if (!this.apiKey) {
      console.warn('GOOGLE_MAPS_API_KEY is not defined in environment variables');
    }
  }

  async computeRoute(origin, destination, options = {}) {
    try {
      const requestBody = {
        origin: {
          location: {
            latLng: {
              latitude: parseFloat(origin.latitude),
              longitude: parseFloat(origin.longitude)
            }
          }
        },
        destination: {
          location: {
            latLng: {
              latitude: parseFloat(destination.latitude),
              longitude: parseFloat(destination.longitude)
            }
          }
        },
        travelMode: options.travelMode || 'DRIVE',
        routeModifiers: {
          avoidTolls: options.avoidTolls || false,
          avoidHighways: options.avoidHighways || false,
          avoidFerries: options.avoidFerries || false
        },
        languageCode: options.languageCode,
        units: 'METRIC'
      };

      // Solo añadir routingPreference para modos de vehículos motorizados
      // BICYCLE y WALK no soportan routingPreference

      if (requestBody.travelMode === 'DRIVE' || requestBody.travelMode === 'TWO_WHEELER') {
        requestBody.routingPreference = options.routingPreference || 'TRAFFIC_AWARE_OPTIMAL';
        requestBody.computeAlternativeRoutes = options.computeAlternatives !== false;
      } else {
        // Para BICYCLE, WALK y TRANSIT no se pueden calcular rutas alternativas
        requestBody.computeAlternativeRoutes = false;
      }

      const response = await axios.post(this.routesBaseUrl, requestBody, {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': this.getFieldMask()
        },
        timeout: 10000
      });

      return this.formatRoutesResponse(response.data);
    } catch (error) {
      if (error.response) {
        console.error('Routes API error response:', error.response.data);
        throw new Error(`Routes API error: ${error.response.data.error?.message || error.response.statusText}`);
      }
      throw new Error(`Routes API error: ${error.message}`);
    }
  }

  getFieldMask() {
    return [
      'routes.duration',
      'routes.distanceMeters',
      'routes.polyline.encodedPolyline',
      'routes.legs.startLocation',
      'routes.legs.endLocation',
      'routes.legs.steps.startLocation',
      'routes.legs.steps.endLocation',
      'routes.legs.steps.navigationInstruction',
      'routes.legs.steps.distanceMeters',
      'routes.legs.steps.staticDuration',
      'routes.legs.steps.polyline',
      'routes.travelAdvisory',
      'routes.routeLabels',
      'routes.viewport'
    ].join(',');
  }

  formatRoutesResponse(data) {
    if (!data.routes || data.routes.length === 0) {
      throw new Error('No route found');
    }

    return data.routes.map(route => {
      const leg = route.legs?.[0];

      return {
        distance: `${(route.distanceMeters / 1000).toFixed(1)} km`,
        distanceMeters: route.distanceMeters,
        duration: this.formatDuration(route.duration),
        durationSeconds: this.parseDuration(route.duration),
        polyline: route.polyline.encodedPolyline,
        viewport: route.viewport ? {
          low: this.formatCoordinates(route.viewport.low),
          high: this.formatCoordinates(route.viewport.high)
        } : null,
        routeLabels: route.routeLabels || [],
        isEcoFriendly: route.routeLabels?.includes('ECO_FRIENDLY') || false,
        travelAdvisory: this.formatTravelAdvisory(route.travelAdvisory),
        steps: leg?.steps?.map(step => ({
          instruction: step.navigationInstruction?.instructions ||
            this.extractTextFromHtml(step.navigationInstruction?.maneuver || ''),
          distance: `${(step.distanceMeters / 1000).toFixed(2)} km`,
          distanceMeters: step.distanceMeters,
          duration: this.formatDuration(step.staticDuration),
          durationSeconds: this.parseDuration(step.staticDuration),
          startLocation: step.startLocation?.latLng ? this.formatCoordinates(step.startLocation.latLng) : null,
          endLocation: step.endLocation?.latLng ? this.formatCoordinates(step.endLocation.latLng) : null,
          polyline: step.polyline?.encodedPolyline
        })) || [],
        startLocation: leg?.startLocation?.latLng ? this.formatCoordinates(leg.startLocation.latLng) : null,
        endLocation: leg?.endLocation?.latLng ? this.formatCoordinates(leg.endLocation.latLng) : null
      };
    });
  }

  formatCoordinates(latLng) {
    if (!latLng || typeof latLng.latitude === 'undefined' || typeof latLng.longitude === 'undefined') {
      return null;
    }
    return {
      latitude: latLng.latitude,
      longitude: latLng.longitude
    };
  }

  formatTravelAdvisory(advisory) {
    if (!advisory) return null;

    return {
      hasTollRoads: advisory.tollInfo ? true : false,
      estimatedTollPrice: advisory.tollInfo?.estimatedPrice?.[0]?.text || null,
      fuelConsumption: advisory.fuelConsumptionMicroliters
        ? `${(advisory.fuelConsumptionMicroliters / 1000000).toFixed(2)} L`
        : null
    };
  }

  formatDuration(duration) {
    if (!duration) return 'Desconocido';

    const seconds = this.parseDuration(duration);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes}min`;
  }

  parseDuration(duration) {
    if (!duration) return 0;
    return parseInt(duration.replace('s', ''));
  }

  extractTextFromHtml(html) {
    return html.replace(/<[^>]*>/g, '');
  }

  async geocode(address) {
    try {
      const response = await axios.get(this.geocodingBaseUrl, {
        params: {
          address,
          key: this.apiKey,
          region: 'es',
          language: 'es'
        },
        timeout: 5000
      });

      if (response.data.status !== 'OK') {
        throw new Error(`Geocoding failed: ${response.data.status}`);
      }

      return response.data.results.map(result => ({
        formattedAddress: result.formatted_address,
        coordinates: {
          latitude: result.geometry.location.lat,
          longitude: result.geometry.location.lng
        },
        placeId: result.place_id,
        types: result.types
      }));
    } catch (error) {
      if (error.response) {
        throw new Error(`Geocoding error: ${error.response.data.error_message || error.response.statusText}`);
      }
      throw new Error(`Geocoding error: ${error.message}`);
    }
  }

  async reverseGeocode(latitude, longitude) {
    try {
      const response = await axios.get(this.geocodingBaseUrl, {
        params: {
          latlng: `${latitude},${longitude}`,
          key: this.apiKey,
          language: 'es'
        },
        timeout: 5000
      });

      if (response.data.status !== 'OK') {
        throw new Error(`Reverse geocoding failed: ${response.data.status}`);
      }

      return response.data.results[0]?.formatted_address || 'Dirección desconocida';
    } catch (error) {
      if (error.response) {
        throw new Error(`Reverse geocoding error: ${error.response.data.error_message || error.response.statusText}`);
      }
      throw new Error(`Reverse geocoding error: ${error.message}`);
    }
  }
}

const googleMapsService = new GoogleMapsService();
export default googleMapsService;