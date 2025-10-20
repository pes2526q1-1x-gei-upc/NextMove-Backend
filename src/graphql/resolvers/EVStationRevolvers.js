import StationsService from '../../services/EVstationsService.js';
import { GraphQLError } from 'graphql';

const stationsService = new StationsService();

const parseConnectorStatus = (statusCode) => {
  switch (statusCode) {
    case "1":
      return "AVAILABLE";
    case "0":
      return "OCCUPIED";
    case "-":
    default:
      return "UNAVAILABLE";
  }
};

// Mapeo de tipo de conector
const parseConnectorType = (tipusCode) => {
  switch (tipusCode?.toUpperCase()) {
    case "F": // Fast AC
    case "M": // Mennekes/Type2
      return "MENNEKES";
    default:
      return "MENNEKES";
  }
};

// Map feature to GQL output type Station
const mapStationData = (feature) => {
  if (!feature || !feature.properties) {
    return null;
  }

  const props = feature.properties;
  const [longitude, latitude] = feature.geometry?.coordinates || [null, null];


  const connectors = [];
  // CCS type connectors
  if (props.estatccs !== "-" && props.potenciaccs !== "-") {
    connectors.push({
      type: "CCS",
      powerKw: parseFloat(props.potenciaccs) || 0,
      status: parseConnectorStatus(props.estatccs),
      statusCode: props.estatccs,
    });
  }

  // CHAdeMO
  if (props.estatcha !== "-" && props.potenciacha !== "-") {
    connectors.push({
      type: "CHADEMO",
      powerKw: parseFloat(props.potenciacha) || 0,
      status: parseConnectorStatus(props.estatcha),
      statusCode: props.estatcha,
    });
  }

  // Mennekes 1
  if (props.estatmnk1 !== "-" && props.potenciamnk1 !== "-") {
    connectors.push({
      type: parseConnectorType(props.tipusmnk1),
      powerKw: parseFloat(props.potenciamnk1) || 0,
      status: parseConnectorStatus(props.estatmnk1),
      statusCode: props.estatmnk1,
    });
  }

  // Mennekes 2
  if (props.estatmnk2 !== "-" && props.potenciamnk2 !== "-") {
    connectors.push({
      type: parseConnectorType(props.tipusmnk2),
      powerKw: parseFloat(props.potenciamnk2) || 0,
      status: parseConnectorStatus(props.estatmnk2),
      statusCode: props.estatmnk2,
    });
  }

  // Schuko 
  if (props.shucko === "1") {
    connectors.push({
      type: "SCHUKO",
      powerKw: 3.7, // IDK standard schuko power
      status: "AVAILABLE", // I am assuming this is true?
      statusCode: "1",
    });
  }

  return {
    id: props.id,
    name: props.nom || "Sin nombre",
    address: props.carrer || null,
    city: props.ciutat || null,
    coordinates: { latitude, longitude },
    connectors: connectors,
    accessType: props.tipus_acces || null,
    isSuperFast: props.superrapid === "1" || props.superrapid === "2",
    lastUpdated: props.data || null,
    distance: feature.distance || null,
  };
};

const StationsResolvers = {
  Query: {
    stations: async () => {
      try {
        const features = await stationsService.fetchAllStations();
        const stations = features.map(mapStationData).filter(Boolean);

        return {
          stations: stations,
          total: stations.length,
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
        const feature = await stationsService.getStationById(id);
        
        if (!feature) {
          throw new GraphQLError('Station not found', {
            extensions: { code: 'NOT_FOUND' },
          });
        }
        
        return mapStationData(feature);
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
        const { coordinates, radiusKm = 5 } = location;
        const { latitude, longitude } = coordinates;
        const features = await stationsService.searchStationsByLocation(
          latitude,
          longitude,
          radiusKm
        );

        return features.map(mapStationData).filter(Boolean);
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

    stationsInBounds: async (_, { bounds }) => {
      try {
        const features = await stationsService.getStationsInBounds(bounds);
        return features.map(mapStationData).filter(Boolean);
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

    stationsByCity: async (_, { city }) => {
      try {
        const features = await stationsService.getStationsByCity(city);
        return features.map(mapStationData).filter(Boolean);
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
  },
};

export default StationsResolvers;