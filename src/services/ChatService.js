import ChatRepository from '../repositories/ChatRepository.js';

class ChatService {
  
  /**
   * Obtener o crear chat directo entre dos usuarios
   */
  async getOrCreateDirectChat(userEmail1, userEmail2) {
    // Validar que no sea el mismo usuario
    if (userEmail1 === userEmail2) {
      throw new Error('Cannot create chat with yourself');
    }

    // Buscar chat existente
    let chat = await ChatRepository.findDirectChat(userEmail1, userEmail2);
    
    if (!chat) {
      // Crear nuevo chat
      const chatId = await ChatRepository.createDirectChat(userEmail1, userEmail2);
      chat = await ChatRepository.getChatById(chatId);
    } else {
      chat = await ChatRepository.getChatById(chat.id);
    }

    return chat;
  }

  /**
   * Crear chat grupal
   */
  async createGroupChat(creatorEmail, name, description, participantEmails) {
    // Validaciones
    if (!name || name.trim().length === 0) {
      throw new Error('Group name is required');
    }

    if (!participantEmails || participantEmails.length === 0) {
      throw new Error('At least one participant is required');
    }

    // Incluir al creador si no está en la lista
    const allParticipants = new Set([creatorEmail, ...participantEmails]);

    const chatId = await ChatRepository.createGroupChat(
      name,
      description,
      Array.from(allParticipants)
    );

    return await ChatRepository.getChatById(chatId);
  }

  /**
   * Enviar mensaje
   */
  async sendMessage(chatId, senderEmail, content, type = 'text') {
    // Verificar que el usuario pertenece al chat
    const isParticipant = await ChatRepository.isParticipant(chatId, senderEmail);
    if (!isParticipant) {
      throw new Error('User is not a participant of this chat');
    }

    // Validar contenido
    if (!content || content.trim().length === 0) {
      throw new Error('Message content cannot be empty');
    }

    const message = await ChatRepository.createMessage(chatId, senderEmail, content, type);
    return message;
  }

  /**
   * Obtener chats del usuario
   */
  async getUserChats(userEmail) {
    return await ChatRepository.getUserChats(userEmail);
  }

  /**
   * Obtener mensajes de un chat
   */
  async getChatMessages(chatId, userEmail, limit = 50, offset = 0) {
    // Verificar acceso
    const isParticipant = await ChatRepository.isParticipant(chatId, userEmail);
    if (!isParticipant) {
      throw new Error('User is not a participant of this chat');
    }

    return await ChatRepository.getChatMessages(chatId, limit, offset);
  }

  /**
   * Eliminar mensaje
   */
  async deleteMessage(messageId, userEmail) {
    const deleted = await ChatRepository.deleteMessage(messageId, userEmail);
    if (!deleted) {
      throw new Error('Message not found or unauthorized');
    }
    return true;
  }

  /**
   * Agregar participante a grupo
   */
  async addParticipantToGroup(chatId, requestorEmail, newParticipantEmail) {
    // Verificar que el chat es un grupo
    const chat = await ChatRepository.getChatById(chatId);
    if (!chat || chat.type !== 'group') {
      throw new Error('Chat is not a group');
    }

    // Verificar que el requestor es participante
    const isParticipant = await ChatRepository.isParticipant(chatId, requestorEmail);
    if (!isParticipant) {
      throw new Error('Unauthorized');
    }

    await ChatRepository.addParticipant(chatId, newParticipantEmail);
    return true;
  }

  /**
   * Salir de un grupo
   */
  async leaveGroup(chatId, userEmail) {
    const chat = await ChatRepository.getChatById(chatId);
    if (!chat || chat.type !== 'group') {
      throw new Error('Chat is not a group');
    }

    await ChatRepository.removeParticipant(chatId, userEmail);
    return true;
  }

  /**
   * Obtener participantes de un chat
   */
  async getChatParticipants(chatId, userEmail) {
    // Verificar acceso
    const isParticipant = await ChatRepository.isParticipant(chatId, userEmail);
    if (!isParticipant) {
      throw new Error('User is not a participant of this chat');
    }

    return await ChatRepository.getChatParticipants(chatId);
  }
}

export default new ChatService();