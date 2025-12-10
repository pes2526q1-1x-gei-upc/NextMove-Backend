import ChatService from '../../services/ChatService.js';
import ChatRepository from '../../repositories/ChatRepository.js';

const ChatResolver = {
  Query: {
    /**
     * Obtener chats del usuario actual
     */
    myChats: async (_, __, context) => {
      // context.user = {email: "xuanyi.qiu@estudiantat.upc.edu"};
      if (!context.user) {
        throw new Error('Authentication required');
      }

      const chats = await ChatService.getUserChats(context.user.email);
      // console.log("mis chats:", chats);
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
      // context.user = {email: "xuanyi.qiu@estudiantat.upc.edu"};
      if (!context.user) {
        throw new Error('Authentication required');
      }

      const chat = await ChatService.getOrCreateDirectChat(
        context.user.email,
        userEmail
      );

      return chat;
    },
  },

  Mutation: {
    /**
     * Crear chat grupal
     */
    createGroupChat: async (_, { name, description, participantEmails }, context) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }

      const chat = await ChatService.createGroupChat(
        context.user.email,
        name,
        description,
        participantEmails
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
    updateGroupChat: async (_, { chatId, name, description }, context) => {
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

      const chat = await ChatRepository.updateGroupChat(chatId, name, description);
      
      if (!chat) {
        throw new Error('Chat not found or not a group');
      }

      return chat;
    },
  },

  Chat: {
    /**
     * Resolver para participantes
     */
    participants: async (parent, _, context) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }

      return await ChatRepository.getChatParticipants(parent.id);
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

    createdAt: (parent) => {
      // Si es null, devolvemos la fecha actual o una fecha cero para no romper la app
      if (!parent.created_at) return new Date().toISOString();
      // Aseguramos que se devuelva un String
      return new Date(parent.created_at).toISOString();
    },

    updatedAt: (parent) => {
      if (!parent.updated_at) return new Date().toISOString();
      return new Date(parent.updated_at).toISOString();
    }
  },

  Message: {
    /**
     * Mapeo de campos snake_case a camelCase
     */
    chatId: (parent) => parent.chat_id,
    senderEmail: (parent) => parent.sender_email,
    senderNickname: (parent) => parent.sender_nickname,
    senderPhoto: (parent) => parent.sender_photo,
    createdAt: (parent) => parent.created_at,
  },

  ChatParticipant: {
    userEmail: (parent) => parent.user_email,
    photoUrl: (parent) => parent.photo,
    joinedAt: (parent) => parent.joined_at,
  },
};

export default ChatResolver;