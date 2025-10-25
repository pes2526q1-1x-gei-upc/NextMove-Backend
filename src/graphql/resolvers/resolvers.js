import { userResolvers } from './userResolvers.js';
import  EVStationResolvers from './EVStationRevolvers.js';
import { estacionDeBicingResolver } from './EstacionDeBicingResolver.js'; 
import { getEstacionesBicingCercanas } from '../../services/EstacionBicingService.js';


export const resolvers = {
  Query: {
    me: userResolvers.Query.me,
    User: userResolvers.Query.User,
    Users: userResolvers.Query.Users,
    stations: EVStationResolvers.Query.stations,
    station: EVStationResolvers.Query.station,
    nearbyStations: EVStationResolvers.Query.nearbyStations,
    getEstacionesDeBicing: estacionDeBicingResolver.Query.getEstacionesDeBicing,
    getEstacionDeBicing: estacionDeBicingResolver.Query.getEstacionDeBicing,
    getEstacionesDeBicingCercanas: estacionDeBicingResolver.Query.getEstacionesDeBicingCercanas
  },
  Mutation: {
    createUser: userResolvers.Mutation.createUser,
    updateMe: userResolvers.Mutation.updateMe,
    deleteMe: userResolvers.Mutation.deleteMe
  },
};