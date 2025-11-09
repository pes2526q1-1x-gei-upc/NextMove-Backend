import AuthService from "../../services/AuthService.js";
import UsersRepository from "../../repositories/UsersRepository.js";

const usersRepo = new UsersRepository();

export const userResolvers = {
  Query: {
    me: async (_, __, context) => {
      try {
        if (!context.user) {
          throw new Error('No autenticado');
        } else console.log("Hola");
        
        const user = context.user;
        console.log("valor de context user", context.user);
        let dbUser = await usersRepo.getUserByEmail(context.user.email);
        console.log("Valor de usuario devuelto", dbUser);
        if (!dbUser) {
          dbUser = await usersRepo.createUser({
            email: user.email
          });
        }


        console.log("Valor de usuario devuelto", dbUser);
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
    createUser: async (_, {email}) => {
      try {
        const existingUser = await usersRepo.getUserByEmail(email);
        if (existingUser) {
          throw new Error(`Usuario con email ${email} ya existe`);
        }
        
        const newUser = await usersRepo.createUser({
          email
        });
        
        return newUser;
      } catch (error) {
        console.error('Error creando usuario:', error);
        throw error;
      }
    },
    
    updateMe: async (
      _,
      {
        email,
        name,
        nickname,
        phoneNumber,
        bioDescription,
        preferredMode,
        preferredLanguage,
        birthDate,
        photo
      },
      context
    ) => {
      try {
        // Verificar autenticación
        if (!context.user) {
          throw new Error('No autenticado');
        }

        const userEmail = context.user.email;

        // Opcional: validar que el email del argumento coincida con el del token
        if (email && email !== userEmail) {
          throw new Error('No puedes actualizar otro usuario');
        }

        const user = await usersRepo.getUserByEmail(userEmail);
        if (!user) {
          throw new Error('Usuario no encontrado');
        }

        const changingData = {};

        // AÑADIMOS TODOS LOS CAMPOS
        if (name !== undefined) changingData.name = name;
        if (nickname !== undefined) changingData.nickname = nickname;
        if (phoneNumber !== undefined) changingData.phoneNumber = phoneNumber;
        if (bioDescription !== undefined) changingData.bioDescription = bioDescription;
        if (preferredMode !== undefined) changingData.preferredMode = preferredMode;
        if (preferredLanguage !== undefined) changingData.preferredLanguage = preferredLanguage;
        if (birthDate !== undefined) changingData.birthDate = birthDate;
        if (photo !== undefined) changingData.photo = photo;

        if (Object.keys(changingData).length === 0) {
          return user; // No hay cambios, devolver actual
        }

        const updatedUser = await usersRepo.updateUser(userEmail, changingData);

        if (!updatedUser) {
          throw new Error('Error al actualizar el usuario');
        }

        console.log(`Usuario ${userEmail} actualizado:`, changingData);
        return updatedUser;

      } catch (error) {
        console.error('Error en updateMe:', error);
        throw error;
      }
    },
        
    deleteMe: async (_, { email }, context) => {
      try {
        if (!context.user) {
          throw new Error('No autenticado');
        }
        
        const userEmail = context.user.email;
        const deleted = await usersRepo.deleteUser(userEmail);
        
        return deleted;
      } catch (error) {
        console.error('Error eliminando usuario:', error);
        return false;
      }
    },
    
    // NUEVOS RESOLVERS QUE FALTAN -- verificar si se pueden agrupar o no
    updateUser: async (_, { email, name, preferredMode }) => {
      try {
        const user = await usersRepo.getUserByEmail(email);
        if (!user) {
          throw new Error('Usuario no encontrado');
        }
        
        const changingData = {};
        if (name) changingData.name = name;
        if (preferredMode) changingData.preferredMode = preferredMode;
        
        const updatedUser = await usersRepo.updateUser(email, changingData);
        
        return updatedUser;
      } catch (error) {
        console.error('Error actualizando usuario:', error);
        throw error;
      }
    },
    
    deleteUser: async (_, { email }) => {
      try {
        const deleted = await usersRepo.deleteUser(email);
        return deleted;
      } catch (error) {
        console.error('Error eliminando usuario:', error);
        return false;
      }
    },
  },
};
