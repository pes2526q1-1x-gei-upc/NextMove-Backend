// src/graphql/resolvers/userResolvers.js
import AuthService from "../../services/AuthService.js";
import UsersRepository from "../../repositories/UsersRepository.js";

const usersRepo = new UsersRepository();

export const userResolvers = {
  Query: {
    /**
     * me() - Obtiene el perfil del usuario autenticado actual
     */
    me: async (_, __, context) => {
      try {
        // El usuario ya está verificado en el context
        if (!context.user) {
          throw new Error('No autenticado');
        }
        
        const user = context.user;
        
        // Buscar usuario en BD por email
        let dbUser = await usersRepo.getUserByEmail(user.email);
        
        // Si no existe en BD, crearlo con datos básicos
        if (!dbUser) {
          dbUser = await usersRepo.createUser({
            email: user.email,
            name: user.displayName || user.name || 'Usuario de prueba',
            preferredMode: 'CAR' // Modo por defecto
          });
        }
        
        return dbUser;
        
      } catch (err) {
        console.error('Error en me():', err.message);
        throw err;
      }
    },
    
    /**
     * User() - Obtiene un usuario específico por email
     */
    User: async (_, { email }) => {
      const user = await usersRepo.getUserByEmail(email);
      if (!user) {
        throw new Error('Usuario no encontrado');
      }
      return user;
    },
    
    /**
     * Users() - Obtiene todos los usuarios
     */
    Users: async () => {
      return await usersRepo.getAllUsers();
    },
  },
  
  Mutation: {
    /**
     * createUser() - Crea un nuevo usuario
     */
    createUser: async (_, { input }) => {
      try {
        const { email, name, preferredMode } = input;
        
        // Verificar si ya existe
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
    
    /**
     * updateMe() - Actualiza el perfil del usuario autenticado
     */
    updateMe: async (_, { changingData }, context) => {
      try {
        // Verificar autenticación
        if (!context.user) {
          throw new Error('No autenticado');
        }
        
        const email = context.user.email;
        
        // Verificar que el usuario existe
        const user = await usersRepo.getUserByEmail(email);
        if (!user) {
          throw new Error('Usuario no encontrado');
        }
        
        // Actualizar
        const updatedUser = await usersRepo.updateUser(email, changingData);
        
        return updatedUser;
      } catch (error) {
        console.error('Error actualizando usuario:', error);
        throw error;
      }
    },
    
    /**
     * deleteMe() - Elimina la cuenta del usuario autenticado
     */
    deleteMe: async (_, __, context) => {
      try {
        // Verificar autenticación
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
