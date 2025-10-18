// src/graphql/resolvers/stationsResolvers.js
import  StationsService  from '../../services/stationsService.js';
import { GraphQLError } from 'graphql';

const stationsService = new StationsService();

// This helper function maps raw station data from the API to the GraphQL EVStation type
const mapStationData = (rawData) => {
  if (!rawData) {
    return null;
  }

  return {
    id: rawData.id || rawData._id,
    name: rawData.nom_estacio || rawData.denominaci || null,
    municipality: rawData.municipi || null,
    region: rawData.comarca || null,
    province: rawData.provincia || null,
    address: rawData.adreca || rawData.direccio || null,
    postalCode: rawData.codi_postal || null,
    latitude: rawData.latitud ? parseFloat(rawData.latitud) : null,
    longitude: rawData.longitud ? parseFloat(rawData.longitud) : null,
    type: rawData.tipus || null,
    power: rawData.potencia ? parseFloat(rawData.potencia) : null,
    chargingPoints: rawData.num_punts ? parseInt(rawData.num_punts) : null,
    access: rawData.acces || null,
    schedule: rawData.horari || null,
    connectionType: rawData.tipus_connexio || null,
  };
};

const EVStationResolvers = {
  Query: {
    stations: async (_,) => {
      try {
        const data = await stationsService.fetchAllStations();

        return {
          stations: data.map(mapStationData).filter(Boolean),
          total: data.length,
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
        const data = await stationsService.getStationById(id);
        return mapStationData(data);
      } catch (error) {
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
        const { latitude, longitude, radius = 5000 } = location;
        
        const data = await stationsService.searchStationsByLocation(
          latitude,
          longitude,
          radius
        );

        return data.map(mapStationData).filter(Boolean);
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
  },
};

export default EVStationResolvers;