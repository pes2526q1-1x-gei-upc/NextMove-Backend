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
        const dbUser = await usersRepo.getUserByEmail(context.user.email);
        
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

    UsersByNickname: async (_, { nickname }) => {
      return await usersRepo.getUsersByNickname(nickname);
    }
  },

  
  Mutation: {
    createUser: async (_, { createInfo }) => {
      try {
        const { email, name, nickname, phoneNumber, preferredMode, preferredLanguage, bioDescription, birthDate } = createInfo;
        console.log('Entramos en createUser. Esto es usuario: ', createInfo);
        
        const existingUserByEmail = await usersRepo.getUserByEmail(email);
        console.log('Existing user by email check: ', existingUserByEmail);
        if (existingUserByEmail) {
          throw new Error(`Ya existe un usuario con el email: ${email}`);
        }
        
        const existingUserByNickname = await usersRepo.getUsersByNickname(nickname);
        console.log('Existing user by nickname check: ', existingUserByNickname);
        if (existingUserByNickname) {
          throw new Error(`Ya existe un usuario con el nickname: ${nickname}`);
        }
        
        const newUser = await usersRepo.createUser({
          email,
          name,
          nickname,
          phoneNumber: phoneNumber || null,
          preferredMode,
          preferredLanguage: preferredLanguage || "ESP",
          bioDescription: bioDescription || null,
          birthDate: birthDate || null,
        });
        
        console.log(`Usuario creado exitosamente: ${email}`);
        return newUser;
        
      } catch (error) {
        console.error('Error creando usuario:', error.message);
        console.log('Error details: ', error.code);
        throw error;
      }
    },
    
    updateMe: async (
      _,
      {
        name,
        nickname,
        phoneNumber,
        bioDescription,
        preferredMode,
        preferredLanguage,
        birthDate,
        photo,
      },
      context
    ) => {
      try {
        if (!context.user) {
          throw new Error('No autenticado');
        }

        const userEmail = context.user.email;

        const user = await usersRepo.getUserByEmail(userEmail);
        if (!user) {
          throw new Error('Usuario no encontrado');
        }

        const changingData = {};

        if (name !== undefined) changingData.name = name;
        if (nickname !== undefined) {
          if (nickname !== user.nickname) {
            const existingUser = await usersRepo.getUsersByNickname(nickname);
            if (existingUser) {
              throw new Error(`El nickname ${nickname} ya está en uso`);
            }
          }
          changingData.nickname = nickname;
        }
        if (phoneNumber !== undefined) changingData.phoneNumber = phoneNumber;
        if (bioDescription !== undefined) changingData.bioDescription = bioDescription;
        if (preferredMode !== undefined) changingData.preferredMode = preferredMode;
        if (preferredLanguage !== undefined) changingData.preferredLanguage = preferredLanguage;
        if (birthDate !== undefined) changingData.birthDate = birthDate;
        if (photo !== undefined) changingData.photo = photo;

        if (Object.keys(changingData).length === 0) {
          return user;
        }

        const updatedUser = await usersRepo.updateUser(userEmail, changingData);

        if (!updatedUser) {
          throw new Error('Error al actualizar el usuario');
        }

        console.log(`Usuario ${userEmail} actualizado`);
        return updatedUser;

      } catch (error) {
        console.error('Error en updateMe:', error.message);
        throw error;
      }
    },
        
    deleteMe: async (_, __, context) => {
      try {
        if (!context.user) {
          throw new Error('No autenticado');
        }
        
        const userEmail = context.user.email;
        const deleted = await usersRepo.deleteUser(userEmail);
        
        return deleted;
      } catch (error) {
        console.error('Error eliminando usuario:', error.message);
        return false;
      }
    },
    
    updateUser: async (_, { email, name, preferredMode }) => {
      try {
        const user = await usersRepo.getUserByEmail(email);
        if (!user) {
          throw new Error('Usuario no encontrado');
        }
        
        const changingData = {};
        if (name !== undefined) changingData.name = name;
        if (preferredMode !== undefined) changingData.preferredMode = preferredMode;
        
        const updatedUser = await usersRepo.updateUser(email, changingData);
        
        return updatedUser;
      } catch (error) {
        console.error('Error actualizando usuario:', error.message);
        throw error;
      }
    },
    
    deleteUser: async (_, { email }) => {
      try {
        const deleted = await usersRepo.deleteUser(email);
        return deleted;
      } catch (error) {
        console.error('Error eliminando usuario:', error.message);
        return false;
      }
    },
  },
};