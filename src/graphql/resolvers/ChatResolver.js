import ChatService from '../../services/ChatService.js';
import ChatRepository from '../../repositories/ChatRepository.js';

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
      context.user = {email: "xuanyiqiu77@gmail.com"};
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

      const success = await ChatRepository.removeParticipant(chatId, userEmail);
      return success;

    },

    toggleAdminStatus: async (_, { chatId, userEmail }, context) => {
      context.user = {email: "xuanyiqiu77@gmail.com"};
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
        throw new Error('Error: permisos insuficientes. Solo un administrador puede otorgar permisos.');
      }

      if (context.user.email === userEmail) {
        throw new Error('Error: no puedes cambiar tus propios permisos de administrador.');
      }

      const success = await ChatRepository.toggleAdminStatus(chatId, userEmail);
      return success;
    },

    deleteGroup: async (_, { chatId }, context) => {
      context.user = {email: "xuanyiqiu77@gmail.com"};
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

      const success = await ChatService.deleteGroup(chatId, context.user.email);
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