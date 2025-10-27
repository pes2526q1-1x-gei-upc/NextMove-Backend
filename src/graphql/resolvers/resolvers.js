import { userResolvers } from './userResolvers.js';
import  EVStationResolvers from './EVStationRevolvers.js';
import { estacionDeBicingResolver } from './EstacionDeBicingResolver.js'; 


export const resolvers = {
  Query: {
    hello: () => 'Hello world!',
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
    deleteMe: userResolvers.Mutation.deleteMe,
    updateUser: userResolvers.Mutation.updateUser,
    deleteUser: userResolvers.Mutation.deleteUser,
  },
};