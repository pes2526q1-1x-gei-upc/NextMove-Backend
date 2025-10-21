import { userResolvers } from './userResolvers.js';
import  EVStationResolvers  from './EVStationRevolvers.js';

export const resolvers = {
  Query: {
    hello: () => 'Hello world!',
    User: userResolvers.Query.User,
    Users: userResolvers.Query.Users,
    stations: EVStationResolvers.Query.stations,
    station: EVStationResolvers.Query.station,
    nearbyStations: EVStationResolvers.Query.nearbyStations,
  },
  Mutation: {
    createUser: userResolvers.Mutation.createUser,
    updateUser: userResolvers.Mutation.updateUser,
    deleteUser: userResolvers.Mutation.deleteUser,
  },
};