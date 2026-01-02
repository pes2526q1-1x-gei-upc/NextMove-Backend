import googleMapsService from '../../services/googleMapsService.js';

const routingResolvers = {
  Query: {
    computeRoute: async (_, { input }, context) => {

      if (!context.user) {
        throw new Error('No autenticado');
      }

      try {
        if (Math.abs(input.origin.latitude) > 90 || Math.abs(input.origin.longitude) > 180 ||
          Math.abs(input.destination.latitude) > 90 || Math.abs(input.destination.longitude) > 180) {
          throw new Error('Coordenadas fuera de rango válido');
        }

        const routes = await googleMapsService.computeRoute(
          input.origin,
          input.destination,
          {
            travelMode: input.travelMode || 'DRIVE',
            routingPreference: input.routingPreference || 'TRAFFIC_AWARE_OPTIMAL',
            computeAlternatives: true,
            avoidTolls: input.avoidTolls || false,
            avoidHighways: input.avoidHighways || false,
            avoidFerries: input.avoidFerries || false,
            languageCode: input.languageCode || 'es'
          }
        );

        const sortedRoutes = routes.sort((a, b) => {
          if (a.isEcoFriendly && !b.isEcoFriendly) return -1;
          if (!a.isEcoFriendly && b.isEcoFriendly) return 1;
          return a.distanceMeters - b.distanceMeters;
        });

        return {
          routes: sortedRoutes,
          recommendedRoute: sortedRoutes[0],
          alternativeRoutesCount: sortedRoutes.length - 1,
          ecoFriendlyOptionsCount: sortedRoutes.filter(r => r.isEcoFriendly).length
        };
      } catch (error) {
        console.error('GraphQL computeRoute error:', error);
        throw new Error(`Error calculando ruta: ${error.message}`);
      }
    },

    searchLocation: async (_, { address }, context) => {
      if (!context.user) {
        throw new Error('No autenticado');
      }

      try {
        if (!address || address.trim().length === 0) {
          throw new Error('La dirección no puede estar vacía');
        }

        return await googleMapsService.geocode(address);
      } catch (error) {
        console.error('GraphQL searchLocation error:', error);
        throw new Error(`Error buscando ubicación: ${error.message}`);
      }
    },

    reverseGeocode: async (_, { coordinates }, context) => {
      if (!context.user) {
        throw new Error('No autenticado');
      }

      try {
        if (Math.abs(coordinates.latitude) > 90 || Math.abs(coordinates.longitude) > 180) {
          throw new Error('Coordenadas fuera de rango válido');
        }

        return await googleMapsService.reverseGeocode(coordinates.latitude, coordinates.longitude);
      } catch (error) {
        console.error('GraphQL reverseGeocode error:', error);
        throw new Error(`Error obteniendo dirección: ${error.message}`);
      }
    }
  }
};

export default routingResolvers;