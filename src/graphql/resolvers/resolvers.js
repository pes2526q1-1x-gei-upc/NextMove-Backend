import { userResolvers } from './userResolvers.js';

export const resolvers = {
  Query: {
    hello: () => 'Hello world!',
    User: userResolvers.Query.User,
    Users: userResolvers.Query.Users,
  },
  Mutation: {
    createUser: userResolvers.Mutation.createUser,
    updateUser: userResolvers.Mutation.updateUser,
    deleteUser: userResolvers.Mutation.deleteUser,
  },
};