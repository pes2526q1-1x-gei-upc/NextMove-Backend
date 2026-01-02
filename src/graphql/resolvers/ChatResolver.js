import ChatService from '../../services/ChatService.js';
import ChatRepository from '../../repositories/ChatRepository.js';
import pool from '../../config/database.js';

const ChatResolver = {
  Query: {
    /**
     * Obtener chats del usuario actual
     */
    myChats: async (_, __, context) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }

      const chats = await ChatService.getUserChats(context.user.email);
      console.log("mis chats:", chats);
      return chats;
    },

    /**
     * Obtener mensajes de un chat
     */
    chatMessages: async (_, { chatId, limit, offset }, context) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }

      const messages = await ChatService.getChatMessages(
        chatId,
        context.user.email,
        limit,
        offset
      );
      console.log('Fetched messages:', messages); // See raw output from ChatService
      return messages;
    },

    /**
     * Obtener participantes de un chat
     */
    chatParticipants: async (_, { chatId }, context) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }

      const participants = await ChatService.getChatParticipants(
        chatId,
        context.user.email
      );

      return participants;
    },

    /**
     * Buscar o crear chat directo
     */
    getOrCreateDirectChat: async (_, { userEmail }, context) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }

      // Verificar si el chat ya existía antes de crearlo
      const existingChat = await ChatRepository.findDirectChat(
        context.user.email,
        userEmail
      );
      const wasNewChat = !existingChat;

      const chat = await ChatService.getOrCreateDirectChat(
        context.user.email,
        userEmail
      );

      // Si se creó un nuevo chat, notificar al otro usuario
      if (wasNewChat && context.io && chat) {
        try {
          // Obtener información del usuario que creó el chat
          const userResult = await pool.query(
            `SELECT nickname, photo FROM users WHERE email = $1`,
            [context.user.email]
          );
          const userNickname = userResult.rows[0]?.nickname || context.user.email;
          const userPhoto = userResult.rows[0]?.photo || null;

          // Emitir evento al otro usuario para que actualice su lista de chats
          context.io.to(`user:${userEmail}`).emit('direct:chat:created', {
            chatId: chat.id,
            otherUserEmail: context.user.email,
            otherUserNickname: userNickname,
            otherUserPhoto: userPhoto,
            timestamp: new Date().toISOString()
          });

          console.log(`[ChatResolver] Evento 'direct:chat:created' emitido a ${userEmail} para chat ${chat.id}`);
        } catch (error) {
          console.error('[ChatResolver] Error emitiendo evento de chat directo creado:', error);
          // No fallar la query si el evento falla
        }
      }

      return chat;
    },
  },

  Mutation: {
    /**
     * Crear chat grupal
     */
    createGroupChat: async (_, { name, description, participantEmails, photo }, context) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }

      const chat = await ChatService.createGroupChat(
        context.user.email,
        name,
        description,
        participantEmails,
        photo
      );

      return chat;
    },

    /**
     * Agregar participante a grupo
     */
    addParticipantToGroup: async (_, { chatId, userEmail }, context) => {


      if (!context.user) {
        throw new Error('Authentication required');
      }

      await ChatService.addParticipantToGroup(
        chatId,
        context.user.email,
        userEmail
      );

      // Emitir evento Socket.IO para notificar al nuevo participante y actualizar lista de chats
      if (context.io) {
        try {
          // Obtener información del chat
          const chat = await ChatRepository.getChatById(chatId);
          if (chat) {
            // Obtener información del usuario añadido
            const UsersRepository = (await import('../../repositories/UsersRepository.js')).default;
            const usersRepo = new UsersRepository();
            const newUser = await usersRepo.getUserByEmail(userEmail);
            
            // Emitir evento al nuevo participante para actualizar su lista de chats
            context.io.to(`user:${userEmail}`).emit('group:user:added', {
              chatId: chatId,
              chatName: chat.name,
              userEmail: userEmail,
              userNickname: newUser?.nickname || userEmail,
              timestamp: new Date().toISOString()
            });

            // Notificar a todos los participantes del grupo (incluyendo el nuevo)
            const participants = await ChatRepository.getChatParticipants(chatId);
            const participantEmails = participants.map(p => p.user_email);
            
            participantEmails.forEach(email => {
              context.io.to(`user:${email}`).emit('group:participant:added', {
                chatId: chatId,
                chatName: chat.name,
                newParticipantEmail: userEmail,
                newParticipantNickname: newUser?.nickname || userEmail,
                timestamp: new Date().toISOString()
              });
            });
          }
        } catch (error) {
          console.error('[ChatResolver] Error emitiendo evento de usuario añadido:', error);
          // No fallar la mutación si el evento falla
        }
      }

      return true;
    },

    /**
     * Salir de grupo
     */
    leaveGroup: async (_, { chatId }, context) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }

      await ChatService.leaveGroup(chatId, context.user.email);
      return true;
    },

    /**
     * Eliminar mensaje
     */
    deleteMessage: async (_, { messageId }, context) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }

      await ChatService.deleteMessage(messageId, context.user.email);
      return true;
    },

    /**
     * Actualizar grupo
     */
    updateGroupChat: async (_, { chatId, name, description, photo }, context) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }

      // Verificar que es participante
      const isParticipant = await ChatRepository.isParticipant(
        chatId,
        context.user.email
      );

      if (!isParticipant) {
        throw new Error('Unauthorized');
      }

      const chat = await ChatRepository.updateGroupChat(chatId, name, description, photo);
      
      if (!chat) {
        throw new Error('Chat not found or not a group');
      }

      return chat;
    },

    /**
     * Expulsar participante de grupo
     */
    kickParticipantFromGroup: async (_, { chatId, userEmail }, context) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }

      // Verificar que es participante
      const isParticipant = await ChatRepository.isParticipant(
        chatId,
        context.user.email
      );

      if (!isParticipant) {
        throw new Error('Error: el usuario no forma parte del grupo.');
      }

      const isAdmin = await ChatRepository.isAdmin(chatId, context.user.email);
      if (!isAdmin) {
        throw new Error('Error: permisos insuficientes. Solo un administrador puede expulsar participantes.');
      }

      // Obtener información del usuario expulsado antes de expulsarlo
      const UsersRepository = (await import('../../repositories/UsersRepository.js')).default;
      const usersRepo = new UsersRepository();
      const kickedUser = await usersRepo.getUserByEmail(userEmail);
      const chat = await ChatRepository.getChatById(chatId);

      const success = await ChatRepository.removeParticipant(chatId, userEmail);
      
      // Emitir evento Socket.IO para expulsar al usuario del chat
      if (success && context.io) {
        try {
          // Obtener todos los sockets del usuario expulsado y sacarlo de la sala
          const userSockets = await context.io.in(`user:${userEmail}`).fetchSockets();
          for (const userSocket of userSockets) {
            // Sacar al usuario de la sala del chat
            userSocket.leave(chatId);
            console.log(`[ChatResolver] Usuario ${userEmail} (socket ${userSocket.id}) expulsado de la sala ${chatId}`);
          }

          // Emitir evento específico al usuario expulsado para cerrar la pantalla de chat
          context.io.to(`user:${userEmail}`).emit('user:kicked:from:group', {
            chatId: chatId,
            chatName: chat?.name || 'Grupo',
            userEmail: userEmail,
            timestamp: new Date().toISOString()
          });

          // Notificar a todos los demás participantes del grupo
          const participants = await ChatRepository.getChatParticipants(chatId);
          participants.forEach(participant => {
            if (participant.user_email !== userEmail) {
              context.io.to(`user:${participant.user_email}`).emit('group:participant:kicked', {
                chatId: chatId,
                chatName: chat?.name || 'Grupo',
                kickedUserEmail: userEmail,
                kickedUserNickname: kickedUser?.nickname || userEmail,
                timestamp: new Date().toISOString()
              });
            }
          });
        } catch (error) {
          console.error('[ChatResolver] Error emitiendo evento de expulsión:', error);
          // No fallar la mutación si el evento falla
        }
      }

      return success;

    },

    toggleAdminStatus: async (_, { chatId, userEmail }, context) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }
      
      // Verificar que el usuario actual es participante
      const isParticipant = await ChatRepository.isParticipant(
        chatId,
        context.user.email
      );
      if (!isParticipant) {
        throw new Error('Error: el usuario no forma parte del grupo.');
      }

      // Verificar que el usuario actual es administrador
      const isAdmin = await ChatRepository.isAdmin(chatId, context.user.email);
      if (!isAdmin) {
        throw new Error('Error: permisos insuficientes. Solo un administrador puede otorgar permisos.');
      }

      // Verificar que el usuario objetivo es participante del grupo
      const targetIsParticipant = await ChatRepository.isParticipant(chatId, userEmail);
      if (!targetIsParticipant) {
        throw new Error('Error: el usuario objetivo no forma parte del grupo.');
      }

      if (context.user.email === userEmail) {
        throw new Error('Error: no puedes cambiar tus propios permisos de administrador.');
      }

      const success = await ChatRepository.toggleAdminStatus(chatId, userEmail);
      
      // Emitir evento Socket.IO para notificar a todos los participantes
      if (success && context.io) {
        try {
          const targetUser = await (await import('../../repositories/UsersRepository.js')).default;
          const usersRepo = new targetUser();
          const user = await usersRepo.getUserByEmail(userEmail);
          const newAdminStatus = await ChatRepository.isAdmin(chatId, userEmail);

          // Notificar a todos los participantes del grupo
          const participants = await ChatRepository.getChatParticipants(chatId);
          participants.forEach(participant => {
            context.io.to(`user:${participant.user_email}`).emit('group:admin:status:changed', {
              chatId: chatId,
              userEmail: userEmail,
              userName: user?.nickname || userEmail,
              isAdmin: newAdminStatus,
              timestamp: new Date().toISOString()
            });
          });
        } catch (error) {
          console.error('[ChatResolver] Error emitiendo evento de cambio de admin:', error);
          // No fallar la mutación si el evento falla
        }
      }
      
      return success;
    },

    deleteGroup: async (_, { chatId }, context) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }

      const isParticipant = await ChatRepository.isParticipant(
        chatId,
        context.user.email
      );
      
      if (!isParticipant) {
        throw new Error('Error: el usuario no forma parte del grupo.');
      }

      const isAdmin = await ChatRepository.isAdmin(chatId, context.user.email);
      if (!isAdmin) {
        throw new Error('Error: solo un administrador puede eliminar el grupo.');
      }

      // Obtener participantes antes de eliminar para notificarles
      const participants = await ChatRepository.getChatParticipants(chatId);
      const chat = await ChatRepository.getChatById(chatId);

      const success = await ChatService.deleteGroup(chatId, context.user.email);
      
      // Emitir evento Socket.IO para notificar a todos los participantes
      if (success && context.io) {
        try {
          // Notificar a todos los participantes que el grupo fue eliminado
          participants.forEach(participant => {
            context.io.to(`user:${participant.user_email}`).emit('group:deleted', {
              chatId: chatId,
              chatName: chat?.name || 'Grupo Eliminado',
              timestamp: new Date().toISOString()
            });
            // También sacar a todos los participantes de la sala de Socket.IO
            context.io.in(`user:${participant.user_email}`).socketsLeave(chatId);
          });
        } catch (error) {
          console.error('[ChatResolver] Error emitiendo evento de eliminación de grupo:', error);
          // No fallar la mutación si el evento falla
        }
      }
      
      return success;
    },
  },

  Chat: {

    /**
     * Resolver para participantes
     */
    participants: async (parent, _, context) => {
      try {
        if (!context.user) return [];       
        const chatId = parent.id || parent.chat_id;
        const participants = await ChatRepository.getChatParticipants(chatId);
        
        console.log(`Participantes para chat ${chatId}:`, participants.length);
        return participants || []; // Siempre devuelve al menos un array vacío
        
      } catch (error) {
        console.error("Error en resolver participants:", error);
        return []; // Devuelve array vacío para no romper la query principal
      }
    },

    /**
     * Resolver para último mensaje
     */
    lastMessage: (parent) => {
      if (!parent.last_message_content) {
        return null;
      }

      return {
        content: parent.last_message_content,
        sender: parent.last_message_sender,
        timestamp: parent.last_message_time,
      };
    },

    createdAt: (parent) => parent.created_at,
    updatedAt: (parent) => parent.updated_at,
  },

  Message: {

    chatId: (parent) => {
      const val = parent.chatId;
      return val;
    },
    
    senderEmail: (parent) => parent.senderEmail || parent.sender_email,
    
    senderNickname: (parent) => parent.senderNickname || parent.sender_nickname,
    
    senderPhoto: (parent) => parent.senderPhoto || parent.sender_photo,
    
    createdAt: (parent) => parent.createdAt || parent.created_at,
    
    deleted: (parent) => parent.deleted !== undefined ? parent.deleted : false,
    
    deletedAt: (parent) => parent.deletedAt || parent.deleted_at || null,
    
    edited: (parent) => parent.edited !== undefined ? parent.edited : false,
    
    editedAt: (parent) => parent.editedAt || parent.edited_at || null,
  },

  ChatParticipant: {
    userEmail: (parent) => parent.user_email,
    photoUrl: (parent) => parent.photo,
    joinedAt: (parent) => parent.joined_at,
    isAdmin: (parent) => parent.is_admin || false,
  },
};

export default ChatResolver;