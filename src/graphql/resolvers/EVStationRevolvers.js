import StationsService from '../../services/EVstationsService.js';
import { mapRepositoryToGraphQL } from '../../utils/EVStationsMapper.js';
import { GraphQLError } from 'graphql';

const stationsService = new StationsService();

function enrichStationWithDynamicData(dbStation) {
  const dynamicData = stationsService.getDynamicData(dbStation.id);
  
  // mapRepositoryToGraphQL combina estático + dinámico
  const station = mapRepositoryToGraphQL(dbStation, dynamicData);


  if (dynamicData) {
    station.accessType = dynamicData.accessType || null;
    station.isSuperFast = dynamicData.isSuperFast || false;
    station.lastUpdated = dynamicData.lastUpdated || null;
  }

  return station;
}

const StationsResolvers = {
  Query: {
    stations: async () => {
      try {
        const dbStations = await stationsService.fetchAllStations();
        
        if (!dbStations || dbStations.length === 0) {
          return {
            stations: [],
            total: 0
          };
        }

        const stations = dbStations
          .map(enrichStationWithDynamicData)
          .filter(Boolean);

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
        const dbStation = await stationsService.getStationById(id);
        
        if (!dbStation) {
          throw new GraphQLError('Station not found', {
            extensions: { code: 'NOT_FOUND' },
          });
        }
        
        return enrichStationWithDynamicData(dbStation);
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

        const dbStations = await stationsService.searchStationsByLocation(
          latitude,
          longitude,
          radiusKm
        );

        return dbStations
          .map(enrichStationWithDynamicData)
          .filter(Boolean);
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

    stationsByCity: async (_, { city }) => {
      try {
        const dbStations = await stationsService.getStationsByCity(city);
        
        return dbStations
          .map(enrichStationWithDynamicData)
          .filter(Boolean);
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
        const dbStations = await stationsService.getStationsInBounds(bounds);
        
        return dbStations
          .map(enrichStationWithDynamicData)
          .filter(Boolean);
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