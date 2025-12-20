// src/sockets/chatHandler.js
import { socketAuthMiddleware } from '../middleware/socketAuth.js';
import ChatService from '../services/ChatService.js';
import ChatRepository from '../repositories/ChatRepository.js';
import pool from '../config/database.js';

export function setupSocketHandlers(io) {
  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    console.log(`[Socket.IO] User connected: ${socket.userEmail}`);
    
    // Notificar al cliente
    socket.emit('connection:success', {
      userId: socket.userId,
      userEmail: socket.userEmail,
      socketId: socket.id,
      timestamp: new Date().toISOString()
    });

    /**
     * Unirse a una sala (chat)
     */
    socket.on('join:room', async (data) => {
      try {
        const chatId = typeof data === 'string' ? data : data.roomId;
        
        if (!chatId) {
          socket.emit('error', { message: 'chatId is required' });
          return;
        }

        // Verificar que el usuario es participante
        const isParticipant = await ChatRepository.isParticipant(chatId, socket.userEmail);
        if (!isParticipant) {
          socket.emit('error', { message: 'Unauthorized: not a participant' });
          return;
        }

        socket.join(chatId);
        console.log(`[Socket.IO] User ${socket.userEmail} joined chat: ${chatId}`);
        
        // Confirmar al usuario
        socket.emit('room:joined', { 
          roomId: chatId,
          timestamp: new Date().toISOString()
        });
        
        // Notificar a otros en la sala
        socket.to(chatId).emit('user:joined', {
          userId: socket.userId,
          userEmail: socket.userEmail,
          userName: socket.userName,
          roomId: chatId,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('[Socket.IO] Error joining room:', error);
        socket.emit('error', { message: 'Failed to join chat' });
      }
    });

    /**
     * Salir de una sala
     */
    socket.on('leave:room', async (data) => {
      try {
        const chatId = typeof data === 'string' ? data : data.roomId;
        
        if (!chatId) return;

        socket.leave(chatId);
        console.log(`[Socket.IO] User ${socket.userEmail} left chat: ${chatId}`);
        
        socket.to(chatId).emit('user:left', {
          userId: socket.userId,
          userEmail: socket.userEmail,
          userName: socket.userName,
          roomId: chatId,
          timestamp: new Date().toISOString()
        });
        
        socket.emit('room:left', { roomId: chatId });
      } catch (error) {
        console.error('[Socket.IO] Error leaving room:', error);
      }
    });

    /**
     * Enviar mensaje (con persistencia)
     */
    socket.on('message:send', async (data) => {
      try {
        const { roomId, content, type = 'text' } = data;
        
        if (!roomId || !content) {
          socket.emit('error', { message: 'roomId and content are required' });
          return;
        }

        // Verificar que está en la sala
        const rooms = Array.from(socket.rooms);
        if (!rooms.includes(roomId)) {
          socket.emit('error', { message: 'You are not in this chat' });
          return;
        }

        // GUARDAR MENSAJE EN BD
        const savedMessage = await ChatService.sendMessage(
          roomId,
          socket.userEmail,
          content,
          type
        );

        // Obtener foto del usuario
        let senderPhoto = null;
        try {
          const userResult = await pool.query(
            'SELECT photo FROM users WHERE email = $1',
            [socket.userEmail]
          );
          senderPhoto = userResult.rows[0]?.photo || null;
        } catch (photoError) {
          console.warn('[Socket.IO] Error fetching user photo:', photoError.message);
          // Continuar sin foto
        }

        // Construir mensaje completo para emitir
        const message = {
          id: savedMessage.id,
          roomId: roomId,
          senderId: socket.userId,
          senderEmail: socket.userEmail,
          senderName: socket.userName,
          senderPhoto: senderPhoto,
          content: savedMessage.content,
          type: savedMessage.type,
          timestamp: savedMessage.created_at,
          deleted: savedMessage.deleted || false,
          deletedAt: savedMessage.deleted_at || null,
          edited: savedMessage.edited || false,
          editedAt: savedMessage.edited_at || null
        };

        // Emitir a todos en la sala (incluyendo el emisor)
        io.to(roomId).emit('message:new', message);
        
        console.log(`[Socket.IO] Message saved and sent in chat ${roomId} by ${socket.userEmail}`);

        // TODO: Notificaciones push para usuarios offline
        await sendPushNotificationsToOfflineUsers(io, roomId, message);

      } catch (error) {
        console.error('[Socket.IO] Error sending message:', error);
        socket.emit('error', { message: error.message || 'Failed to send message' });
      }
    });

    /**
     * Eliminar mensaje
     */
    socket.on('message:delete', async (data) => {
      try {
        const { messageId, roomId } = data;
        
        if (!messageId || !roomId) {
          socket.emit('error', { message: 'messageId and roomId are required' });
          return;
        }

        // Eliminar de BD
        const deleted = await ChatService.deleteMessage(messageId, socket.userEmail);
        
        if (deleted) {
          // Obtener sockets en la sala para logging
          const socketsInRoom = await io.in(roomId).fetchSockets();
          console.log(`[Socket.IO] 🗑️ Message ${messageId} deleted by ${socket.userEmail} in room ${roomId}`);
          console.log(`[Socket.IO] 📡 Notifying ${socketsInRoom.length} users in room ${roomId}`);
          
          // Notificar a todos en la sala (incluyendo el emisor)
          io.to(roomId).emit('message:deleted', {
            messageId,
            roomId,
            timestamp: new Date().toISOString()
          });
          
          console.log(`[Socket.IO] ✅ Event 'message:deleted' emitted to room ${roomId}`);
        } else {
          console.log(`[Socket.IO] ⚠️ Failed to delete message ${messageId} - not found or unauthorized`);
        }
      } catch (error) {
        console.error('[Socket.IO] Error deleting message:', error);
        socket.emit('error', { message: 'Failed to delete message' });
      }
    });

    /**
     * Editar mensaje
     */
    socket.on('message:edit', async (data) => {
      try {
        const { messageId, roomId, content } = data;
        
        if (!messageId || !roomId || !content) {
          socket.emit('error', { message: 'messageId, roomId and content are required' });
          return;
        }

        // Verificar que está en la sala
        const rooms = Array.from(socket.rooms);
        if (!rooms.includes(roomId)) {
          socket.emit('error', { message: 'You are not in this chat' });
          return;
        }

        // Editar en BD
        const editedMessage = await ChatService.editMessage(messageId, socket.userEmail, content);
        
        if (editedMessage) {
          // Obtener foto del usuario
          let senderPhoto = null;
          try {
            const userResult = await pool.query(
              'SELECT photo FROM users WHERE email = $1',
              [socket.userEmail]
            );
            senderPhoto = userResult.rows[0]?.photo || null;
          } catch (photoError) {
            console.warn('[Socket.IO] Error fetching user photo:', photoError.message);
          }

          // Construir mensaje actualizado para emitir
          const message = {
            id: editedMessage.id,
            roomId: roomId,
            senderId: socket.userId,
            senderEmail: socket.userEmail,
            senderName: socket.userName,
            senderPhoto: senderPhoto,
            content: editedMessage.content,
            type: editedMessage.type,
            timestamp: editedMessage.created_at,
            deleted: editedMessage.deleted || false,
            deletedAt: editedMessage.deleted_at || null,
            edited: editedMessage.edited || false,
            editedAt: editedMessage.edited_at || null
          };

          // Notificar a todos en la sala (incluyendo el emisor)
          io.to(roomId).emit('message:edited', message);
          
          console.log(`[Socket.IO] ✏️ Message ${messageId} edited by ${socket.userEmail} in room ${roomId}`);
        } else {
          console.log(`[Socket.IO] ⚠️ Failed to edit message ${messageId} - not found or unauthorized`);
          socket.emit('error', { message: 'Failed to edit message' });
        }
      } catch (error) {
        console.error('[Socket.IO] Error editing message:', error);
        socket.emit('error', { message: error.message || 'Failed to edit message' });
      }
    });

    /**
     * Usuario escribiendo
     */
    socket.on('typing:start', (data) => {
      try {
        const { roomId } = data;
        if (!roomId) return;

        socket.to(roomId).emit('typing:user', {
          userId: socket.userId,
          userEmail: socket.userEmail,
          userName: socket.userName,
          roomId,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('[Socket.IO] Error in typing:start:', error);
      }
    });

    /**
     * Usuario dejó de escribir
     */
    socket.on('typing:stop', (data) => {
      try {
        const { roomId } = data;
        if (!roomId) return;

        socket.to(roomId).emit('typing:stop', {
          userId: socket.userId,
          userEmail: socket.userEmail,
          userName: socket.userName,
          roomId,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('[Socket.IO] Error in typing:stop:', error);
      }
    });

    /**
     * Obtener usuarios conectados en una sala
     */
    socket.on('room:users:get', async (data) => {
      try {
        const { roomId } = data;
        
        if (!roomId) {
          socket.emit('error', { message: 'roomId is required' });
          return;
        }

        const socketsInRoom = await io.in(roomId).fetchSockets();
        const users = socketsInRoom.map(s => ({
          userId: s.userId,
          userEmail: s.userEmail,
          userName: s.userName,
          socketId: s.id
        }));

        socket.emit('room:users:list', {
          roomId,
          users,
          count: users.length
        });
      } catch (error) {
        console.error('[Socket.IO] Error getting room users:', error);
        socket.emit('error', { message: 'Failed to get room users' });
      }
    });

    /**
     * Ping/Pong
     */
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date().toISOString() });
    });

    /**
     * Desconexión
     */
    socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO] User disconnected: ${socket.userEmail} (Reason: ${reason})`);
      
      // Notificar a todas las salas en las que estaba
      const rooms = Array.from(socket.rooms);
      rooms.forEach(roomId => {
        if (roomId !== socket.id) {
          socket.to(roomId).emit('user:disconnected', {
            userId: socket.userId,
            userEmail: socket.userEmail,
            userName: socket.userName,
            roomId,
            timestamp: new Date().toISOString()
          });
        }
      });
    });

    /**
     * Error handler
     */
    socket.on('error', (error) => {
      console.error(`[Socket.IO] Socket error for user ${socket.userEmail}:`, error);
    });
  });

  // Error handler global
  io.engine.on('connection_error', (err) => {
    console.error('[Socket.IO Engine] Connection error:', err);
  });

  console.log('[Socket.IO] Handlers configured with persistence');
}

/**
 * Enviar notificaciones push a usuarios offline
 */
async function sendPushNotificationsToOfflineUsers(io, chatId, message) {
  try {
    // Obtener todos los participantes del chat
    const participants = await ChatRepository.getChatParticipants(chatId);
    
    // Obtener usuarios conectados en la sala
    const socketsInRoom = await io.in(chatId).fetchSockets();
    const onlineEmails = socketsInRoom.map(s => s.userEmail);
    
    // Filtrar usuarios offline
    const offlineParticipants = participants.filter(
      p => !onlineEmails.includes(p.user_email) && p.user_email !== message.senderEmail
    );
    
    // TODO: Implementar envío de notificaciones push
    if (offlineParticipants.length > 0) {
      console.log(`[Push] ${offlineParticipants.length} offline users to notify`);
      // await PushNotificationService.sendNotifications(offlineParticipants, message);
    }
  } catch (error) {
    console.error('[Push] Error sending notifications:', error);
  }
}