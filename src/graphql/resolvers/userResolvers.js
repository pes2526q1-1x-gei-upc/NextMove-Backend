// src/graphql/resolvers/userResolvers.js
import AuthService from "../../services/AuthService.js";
import UsersRepository from "../../repositories/UsersRepository.js";

const usersRepo = new UsersRepository();

export const userResolvers = {
  Query: {
    me: async (_, __, context) => {
      try {
        if (!context.user) {
          throw new Error('No autenticado');
        }
        
        const user = context.user;
        let dbUser = await usersRepo.getUserByEmail(user.email);
        
        if (!dbUser) {
          dbUser = await usersRepo.createUser({
            email: user.email,
            name: user.displayName || user.name || 'Usuario de prueba',
            preferredMode: 'CAR'
          });
        }
        
        return dbUser;
        
      } catch (err) {
        console.error('Error en me():', err.message);
        throw err;
      }
    },
    
    User: async (_, { email }) => {
      const user = await usersRepo.getUserByEmail(email);
      if (!user) {
        throw new Error('Usuario no encontrado');
      }
      return user;
    },
    
    Users: async () => {
      return await usersRepo.getAllUsers();
    },
  },
  
  Mutation: {
    createUser: async (_, { input }) => {
      try {
        const { email, name, preferredMode } = input;
        
        const existingUser = await usersRepo.getUserByEmail(email);
        if (existingUser) {
          throw new Error(`Usuario con email ${email} ya existe`);
        }
        
        const newUser = await usersRepo.createUser({
          email,
          name,
          preferredMode
        });
        
        return newUser;
      } catch (error) {
        console.error('Error creando usuario:', error);
        throw error;
      }
    },
    
    updateMe: async (_, { changingData }, context) => {
      try {
        if (!context.user) {
          throw new Error('No autenticado');
        }
        
        const email = context.user.email;
        
        const user = await usersRepo.getUserByEmail(email);
        if (!user) {
          throw new Error('Usuario no encontrado');
        }
        
        const updatedUser = await usersRepo.updateUser(email, changingData);
        
        return updatedUser;
      } catch (error) {
        console.error('Error actualizando usuario:', error);
        throw error;
      }
    },
    
    // ✅ AGREGAR ESTE RESOLVER
    updateUser: async (_, { email, changingData }) => {
      try {
        const user = await usersRepo.getUserByEmail(email);
        if (!user) {
          throw new Error('Usuario no encontrado');
        }
        
        const updatedUser = await usersRepo.updateUser(email, changingData);
        
        return updatedUser;
      } catch (error) {
        console.error('Error actualizando usuario:', error);
        throw error;
      }
    },
    
    deleteMe: async (_, __, context) => {
      try {
        if (!context.user) {
          throw new Error('No autenticado');
        }
        
        const email = context.user.email;
        const deleted = await usersRepo.deleteUser(email);
        
        return deleted;
      } catch (error) {
        console.error('Error eliminando usuario:', error);
        return false;
      }
    },
  },
};
