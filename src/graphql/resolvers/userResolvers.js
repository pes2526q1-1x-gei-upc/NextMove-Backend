import UsersRepository from "../../repositories/UsersRepository.js";
import FriendshipRepository from "../../repositories/FriendshipRepository.js";
import RankingService from "../../services/RankingService.js";

const usersRepo = new UsersRepository();
const friendshipRepo = new FriendshipRepository();
const rankingService = new RankingService();

export const userResolvers = {
  Query: {
    me: async (_, __, context) => {
      try {
        if (!context.user) {
          throw new Error("No autenticado");
        }

        const dbUser = await usersRepo.getUserByEmail(context.user.email);
        
        try {
          const userStats = await rankingService.getUserStats(context.user.email, 'km_recorridos');
          dbUser.statistics = userStats || null;
        } catch (statsError) {
          console.warn('Warning: No se pudieron obtener estadísticas para el usuario:', statsError.message);
          dbUser.statistics = null;
        }
        
        return dbUser;
      } catch (err) {
        console.error("Error en me():", err.message);
        throw err;
      }
    },

    User: async (_, { email }) => {
      const user = await usersRepo.getUserByEmail(email);
      if (!user) {
        throw new Error("Usuario no encontrado");
      }
      return user;
    },

    ExistsUser: async (_, { email }) => {
      try {
        const user = await usersRepo.getUserByEmail(email);
        if (user) {
          return { exists: true, isRegWithGoogle: user.regWithGoogle };
        }

        return { exists: false, isRegWithGoogle: null };
      } catch (error) {
        console.error("Error en ExistsUser:", error.message);
        throw error;
      }
    },

    Users: async () => {
      return await usersRepo.getAllUsers();
    },

    UsersByNickname: async (_, { nickname }, context) => {
      console.log(`\n--- [DEBUG] Buscando usuarios por: "${nickname}" ---`);

      const users = await usersRepo.getUsersByNickname(nickname);
      console.log(`[DEBUG] Candidatos iniciales encontrados: ${users.length}`);

      if (!context.user) return users;

      try {
        const myEmail = context.user.email;
        const myProfile = await usersRepo.getUserByEmail(myEmail);
        const myNickname = myProfile.nickname;

        if (!myNickname) {
          console.warn(
            "[WARN] No se pudo determinar mi nickname, devuelvo lista sin filtrar."
          );
          return users;
        }

        const myBlocks = await friendshipRepo.getBlockList(myEmail);
        const usersIBlocked = new Set(myBlocks.map((b) => b.blocked));

        const finalResults = await Promise.all(
          users.map(async (candidateUser) => {
            if (usersIBlocked.has(candidateUser.nickname)) {
              return null;
            }

            try {
              const candidateBlockList = await friendshipRepo.getBlockList(
                candidateUser.email
              );
              const isMeBlocked = candidateBlockList.some(
                (b) => b.blocked === myNickname
              );

              if (isMeBlocked) {
                console.log(
                  `[DEBUG] Ocultando a ${candidateUser.nickname} -> Me tiene bloqueado en su lista:`,
                  candidateBlockList
                );
                return null;
              }

              return candidateUser;
            } catch (err) {
              console.error(
                `[ERROR] Fallo verificando bloqueos de ${candidateUser.nickname}`,
                err
              );
              return candidateUser;
            }
          })
        );

        const filteredUsers = finalResults.filter((u) => u !== null);
        console.log(
          `[DEBUG] Usuarios devueltos tras filtros: ${filteredUsers.length}`
        );
        return filteredUsers;
      } catch (error) {
        console.error("[ERROR] Error general filtrando usuarios:", error);
        return users;
      }
    },

    UsersSearchHistory: async (_, __, context) => {
      if (!context.user) {
        throw new Error("No autenticado");
      }

      try {
        return await usersRepo.getUserSearchHistory(context.user.email);
      } catch (error) {
        throw new Error("Error retrieving user search history.", error);
      }
    },
  },

  // Resolvers de campos para el tipo User
  User: {
    isBanned: (parent) => parent.isBanned ?? false,
    banInfo: (parent) => parent.banInfo ?? null,
  },

  Mutation: {
    createUser: async (_, { createInfo }) => {
      try {
        const {
          email,
          photo,
          name,
          nickname,
          phoneNumber,
          preferredMode,
          preferredLanguage,
          bioDescription,
          birthDate,
          regWithGoogle,
        } = createInfo;
        console.log("Entramos en createUser. Esto es usuario: ", createInfo);

        const existingUserByEmail = await usersRepo.getUserByEmail(email);
        console.log("Existing user by email check: ", existingUserByEmail);
        if (existingUserByEmail) {
          throw new Error(`Ya existe un usuario con el email: ${email}`);
        }

        const existingUserByNickname =
          await usersRepo.existsUserByNickname(nickname);
        console.log("Existing user by nickname check: ", existingUserByNickname);
        if (existingUserByNickname) {
          throw new Error(`Ya existe un usuario con el nickname: ${nickname}`);
        }

        await usersRepo.createUser({
          email,
          photo,
          name,
          nickname,
          phoneNumber: phoneNumber || null,
          preferredMode,
          preferredLanguage: preferredLanguage || "ESP",
          bioDescription: bioDescription || null,
          birthDate: birthDate || null,
          regWithGoogle,
        });

        console.log(`Usuario creado exitosamente: ${email}`);

        // Recargar usando getUserByEmail, que añade isBanned y banInfo
        return await usersRepo.getUserByEmail(email);
      } catch (error) {
        console.error("Error creando usuario:", error.message);
        console.log("Error details: ", error.code);
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
          throw new Error("No autenticado");
        }

        const userEmail = context.user.email;

        const user = await usersRepo.getUserByEmail(userEmail);
        if (!user) {
          throw new Error("Usuario no encontrado");
        }

        const changingData = {};

        if (name !== undefined) changingData.name = name;
        if (nickname !== undefined) {
          if (nickname !== user.nickname) {
            const existingUser = await usersRepo.existsUserByNickname(nickname);
            if (existingUser) {
              throw new Error(`El nickname ${nickname} ya está en uso`);
            }
          }
          changingData.nickname = nickname;
        }
        if (phoneNumber !== undefined) changingData.phoneNumber = phoneNumber;
        if (bioDescription !== undefined)
          changingData.bioDescription = bioDescription;
        if (preferredMode !== undefined)
          changingData.preferredMode = preferredMode;
        if (preferredLanguage !== undefined)
          changingData.preferredLanguage = preferredLanguage;
        if (birthDate !== undefined) changingData.birthDate = birthDate;
        if (photo !== undefined) changingData.photo = photo;

        if (Object.keys(changingData).length === 0) {
          return user;
        }

        const updatedUser = await usersRepo.updateUser(
          userEmail,
          changingData
        );

        if (!updatedUser) {
          throw new Error("Error al actualizar el usuario");
        }

        console.log(`Usuario ${userEmail} actualizado`);
        return updatedUser;
      } catch (error) {
        console.error("Error en updateMe:", error.message);
        throw error;
      }
    },

    deleteProfilePhoto: async (_, __, context) => {
      try {
        if (!context.user) {
          throw new Error("No autenticado");
        }

        const userEmail = context.user.email;

        const user = await usersRepo.getUserByEmail(userEmail);
        if (!user) {
          throw new Error("Usuario no encontrado");
        }

        const updatedUser = await usersRepo.updateUser(userEmail, {
          photo: null,
        });

        if (!updatedUser) {
          throw new Error("Error al actualizar el usuario");
        }

        console.log(`Foto de perfil eliminada para ${userEmail}`);
        return updatedUser;
      } catch (error) {
        console.error("Error en deleteProfilePhoto:", error.message);
        throw error;
      }
    },

    deleteMe: async (_, __, context) => {
      try {
        if (!context.user) {
          throw new Error("No autenticado");
        }

        const userEmail = context.user.email;
        const deleted = await usersRepo.deleteUser(userEmail);

        return deleted;
      } catch (error) {
        console.error("Error eliminando usuario:", error.message);
        return false;
      }
    },

    updateUser: async (_, { email, name, preferredMode }) => {
      try {
        const user = await usersRepo.getUserByEmail(email);
        if (!user) {
          throw new Error("Usuario no encontrado");
        }

        const changingData = {};
        if (name !== undefined) changingData.name = name;
        if (preferredMode !== undefined)
          changingData.preferredMode = preferredMode;

        const updatedUser = await usersRepo.updateUser(email, changingData);

        return updatedUser;
      } catch (error) {
        console.error("Error actualizando usuario:", error.message);
        throw error;
      }
    },

    deleteUser: async (_, { email }) => {
      try {
        const deleted = await usersRepo.deleteUser(email);
        return deleted;
      } catch (error) {
        console.error("Error eliminando usuario:", error.message);
        return false;
      }
    },

  },
};
