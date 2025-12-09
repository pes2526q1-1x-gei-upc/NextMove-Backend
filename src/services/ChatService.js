// src/services/ChatService.js
import ChatRepository from '../repositories/ChatRepository.js';
import FriendshipRepository from '../repositories/FriendshipRepository.js';
import pool from '../config/database.js';

const friendshipRepository = new FriendshipRepository();

class ChatService {
  
  /**
   * Helper: Convertir nicknames a emails
   */
  async _getNicknameEmail(nickname) {
    const result = await pool.query(
      'SELECT email FROM users WHERE nickname = $1',
      [nickname]
    );
    return result.rows[0]?.email || null;
  }

  /**
   * Helper: Verificar si dos usuarios son amigos
   */
  async _areFriends(userEmail1, userEmail2) {
    const friends = await friendshipRepository.getFriendships(userEmail1);
    
    // Convertir nicknames a emails
    for (const friend of friends) {
      const friendEmail = await this._getNicknameEmail(friend.name);
      if (friendEmail === userEmail2) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Obtener o crear chat directo entre dos usuarios
   */
  async getOrCreateDirectChat(userEmail1, userEmail2) {
    if (userEmail1 === userEmail2) {
      throw new Error('Cannot create chat with yourself');
    }

    // Verificar que son amigos
    const areFriends = await this._areFriends(userEmail1, userEmail2);
    if (!areFriends) {
      throw new Error('Users are not friends');
    }

    // Buscar chat existente
    let chat = await ChatRepository.findDirectChat(userEmail1, userEmail2);
    
    if (!chat) {
      const chatId = await ChatRepository.createDirectChat(userEmail1, userEmail2);
      chat = await ChatRepository.getChatById(chatId);
    } else {
      chat = await ChatRepository.getChatById(chat.id);
    }

    return chat;
  }

  /**
   * Obtener chats del usuario con info enriquecida
   */
  async getUserChats(userEmail) {
    const chats = await ChatRepository.getUserChats(userEmail);
    
    // Para chats directos, obtener info del otro usuario
    const enrichedChats = await Promise.all(
      chats.map(async (chat) => {
        if (chat.type === 'direct') {
          const participants = await ChatRepository.getChatParticipants(chat.id);
          const otherUser = participants.find(p => p.user_email !== userEmail);
          
          return {
            ...chat,
            name: otherUser?.nickname || 'Usuario',
            otherUserEmail: otherUser?.user_email,
          };
        }
        return chat;
      })
    );
    
    return enrichedChats;
  }

  /**
   * Crear chat grupal
   */
  async createGroupChat(creatorEmail, name, description, participantEmails) {
    if (!name || name.trim().length === 0) {
      throw new Error('Group name is required');
    }

    if (!participantEmails || participantEmails.length === 0) {
      throw new Error('At least one participant is required');
    }

    // Verificar que todos son amigos del creador
    for (const participantEmail of participantEmails) {
      if (participantEmail !== creatorEmail) {
        const areFriends = await this._areFriends(creatorEmail, participantEmail);
        if (!areFriends) {
          throw new Error(`${participantEmail} is not your friend`);
        }
      }
    }

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
    const isParticipant = await ChatRepository.isParticipant(chatId, senderEmail);
    if (!isParticipant) {
      throw new Error('User is not a participant of this chat');
    }

    if (!content || content.trim().length === 0) {
      throw new Error('Message content cannot be empty');
    }

    const message = await ChatRepository.createMessage(chatId, senderEmail, content, type);
    return message;
  }

  /**
   * Obtener mensajes de un chat
   */
  async getChatMessages(chatId, userEmail, limit = 50, offset = 0) {
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
    const chat = await ChatRepository.getChatById(chatId);
    if (!chat || chat.type !== 'group') {
      throw new Error('Chat is not a group');
    }

    const isParticipant = await ChatRepository.isParticipant(chatId, requestorEmail);
    if (!isParticipant) {
      throw new Error('Unauthorized');
    }

    // Verificar amistad
    const areFriends = await this._areFriends(requestorEmail, newParticipantEmail);
    if (!areFriends) {
      throw new Error('New participant must be your friend');
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
    const isParticipant = await ChatRepository.isParticipant(chatId, userEmail);
    if (!isParticipant) {
      throw new Error('User is not a participant of this chat');
    }

    return await ChatRepository.getChatParticipants(chatId);
  }
}

export default new ChatService();