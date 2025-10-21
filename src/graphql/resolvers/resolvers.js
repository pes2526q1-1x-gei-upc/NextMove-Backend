import { estacionDeBiciResolver } from './estacionDeBiciResolver.js';
import { userResolvers } from './userResolvers.js';
import {estacionDeBicingResolver} from './EstacionDeBicingResolver.js'; 

export const resolvers = {
  Query: {
    hello: () => 'Hello world!',
    User: userResolvers.Query.User,
    Users: userResolvers.Query.Users,
    getEstacionesDeBicing: estacionDeBicingResolver.Query.getEstacionesDeBicing,
    getEstacionDeBicing: estacionDeBicingResolver.Query.getEstacionDeBicing
  },
  Mutation: {
    createUser: userResolvers.Mutation.createUser,
    updateUser: userResolvers.Mutation.updateUser,
    deleteUser: userResolvers.Mutation.deleteUser,
  },
};