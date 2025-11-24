import StationsService from '../../services/EVstationsService.js';
import { GraphQLError } from 'graphql';

const stationsService = new StationsService();

const StationsResolvers = {
  Query: {
    stations: async () => {
      try {
        const stations = await stationsService.getAllStations();
        
        return {
          stations,
          total: stations.length
        };
      } catch (error) {
        console.error('Error in stations resolver:', error);
        throw new GraphQLError('Failed to fetch stations', {
          extensions: { 
            code: 'INTERNAL_SERVER_ERROR',
            originalError: error.message,
          },
        });
      }
    },

    station: async (_, { id }) => {
      try {
        const station = await stationsService.getStationById(id);
        
        if (!station) {
          throw new GraphQLError('Station not found', {
            extensions: { code: 'NOT_FOUND' },
          });
        }
        
        return station;
      } catch (error) {
        if (error instanceof GraphQLError) {
          throw error;
        }
        
        console.error('Error in station resolver:', error);
        throw new GraphQLError('Failed to fetch station', {
          extensions: { 
            code: 'INTERNAL_SERVER_ERROR',
            originalError: error.message,
          },
        });
      }
    },

    nearbyStations: async (_, { location }) => {
      try {
        const { coordinates, radiusKm = 5 } = location;
        const { latitude, longitude } = coordinates;

        const stations = await stationsService.searchStationsByLocation(
          latitude,
          longitude,
          radiusKm
        );

        return stations;
      } catch (error) {
        console.error('Error in nearbyStations resolver:', error);
        throw new GraphQLError('Failed to search nearby stations', {
          extensions: { 
            code: 'INTERNAL_SERVER_ERROR',
            originalError: error.message,
          },
        });
      }
    },

    stationsByAddress: async (_, { address }) => {
      try {
        const stations = await stationsService.getStationsByAddress(address);
        return stations;
      } catch (error) {
        console.error('Error in stationsByAddress resolver:', error);
        throw new GraphQLError('Failed to fetch stations by address', {
          extensions: { 
            code: 'INTERNAL_SERVER_ERROR',
            originalError: error.message,
          },
        });
      }
    },

    stationsByCity: async (_, { city }) => {
      try {
        const stations = await stationsService.getStationsByCity(city);
        return stations;
      } catch (error) {
        console.error('Error in stationsByCity resolver:', error);
        throw new GraphQLError('Failed to fetch stations by city', {
          extensions: { 
            code: 'INTERNAL_SERVER_ERROR',
            originalError: error.message,
          },
        });
      }
    },

    stationsInBounds: async (_, { bounds }) => {
      try {
        const stations = await stationsService.getStationsInBounds(bounds);
        return stations;
      } catch (error) {
        console.error('Error in stationsInBounds resolver:', error);
        throw new GraphQLError('Failed to fetch stations in bounds', {
          extensions: { 
            code: 'INTERNAL_SERVER_ERROR',
            originalError: error.message,
          },
        });
      }
    },
  },
};

export default StationsResolvers;