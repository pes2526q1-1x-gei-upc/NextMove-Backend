import FriendshipRepository from '../../repositories/FriendshipRepository.js';

const friendshipRepository = new FriendshipRepository();

export const friendshipResolvers = {
  Query: {
    ListFriends: async (_, __, context) => {
      if (!context.user) {
        throw new Error('No autenticado');
      }
      return await friendshipRepository.getFriendships(context.user.email);
    },
    AllFriends: async () => {
      return await friendshipRepository.getAllFriendships();
    },
    BlockList: async (_, __, context) => {
      if (!context.user) {
        throw new Error('No autenticado');
      }
      return await friendshipRepository.getBlockList(context.user.email);
    }
  },
  Mutation:{
    AddFriendship: async (_, { nickname }, context) => {
      console.log("starting to add friendship");
      if (!context.user) {
        throw new Error('No autenticado');
      }
      try {
        return await friendshipRepository.addFriendship(context.user.email, nickname);
      }
      catch (error){
        if (error.code === '23505'){
          throw new Error('Friendship already exists.');
        }
        if (error.code === '23503'){
          throw new Error('One or both users do not exist.');
        }
        throw error;
      }
    },
    RemoveFriendship: async (_, { nickname }, context) => {
      const result = await friendshipRepository.removeFriendship(context.user.email, nickname);
      
      // Emitir evento Socket.IO al otro usuario si se eliminó un chat
      if (result.deletedChatId && result.friendEmail && context.io) {
        try {
          // Obtener el nickname del usuario que eliminó la amistad
          const userNickname = result.nickname;
          
          // Emitir evento al otro usuario para notificar que el chat fue eliminado
          context.io.to(`user:${result.friendEmail}`).emit('friendship:deleted', {
            chatId: result.deletedChatId,
            deletedBy: context.user.email,
            deletedByNickname: userNickname,
            timestamp: new Date().toISOString()
          });
          
          console.log(`[FriendshipResolver] Evento 'friendship:deleted' emitido a ${result.friendEmail} para chat ${result.deletedChatId}`);
        } catch (error) {
          console.error('[FriendshipResolver] Error emitiendo evento de eliminación de amistad:', error);
          // No fallar la mutación si el evento falla
        }
      }
      
      return result.nickname;
    },
    BlockUser: async (_, { nickname }, context) => {
      try {
        if (!context.user) {
          throw new Error('No autenticado');
        }
        return await friendshipRepository.blockUser(context.user.email, nickname);
      } catch (error) {
        if (error.code === '23503'){
          throw new Error('User to block does not exist.');
        }
        if (error.code === '23505'){
          throw new Error('User is already blocked.');
        }
        if (error.code === '23514'){
          throw new Error('Cannot block yourself.');
        }
        throw error;
      }
    },
    UnBlockUser: async (_, { nickname }, context) => {
      if (!context.user) {
        throw new Error('No autenticado');
      }
      return await friendshipRepository.unBlockUser(context.user.email, nickname);
    }
  }
};