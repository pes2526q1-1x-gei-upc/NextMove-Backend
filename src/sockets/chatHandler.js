// src/sockets/chatHandler.js
import { socketAuthMiddleware } from '../middleware/socketAuth.js';

export function setupSocketHandlers(io) {
  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId}`);

    socket.on('join:room', (data) => {

      const roomId = typeof data === 'string' ? data : data.roomId; // Fix aquí
      
      if (!roomId) {
        socket.emit('error', { message: 'roomId is required' });
        return;
      }   

      socket.join(roomId);
      console.log(`User ${socket.userId} joined room: ${roomId}`);
      
      socket.to(roomId).emit('user:joined', {
        userId: socket.userId,
        timestamp: new Date().toISOString()
      });
    });

    socket.on('message:send', (data) => {
      const { roomId, content } = data;
      
      const message = {
        id: Date.now().toString(),
        roomId,
        senderId: socket.userId,
        content,
        timestamp: new Date().toISOString()
      };

      io.to(roomId).emit('message:new', message);
      
      console.log(`Message sent in room ${roomId} by ${socket.userId}`);
    });

    socket.on('typing:start', (data) => {
      const { roomId } = data;
      socket.to(roomId).emit('typing:user', {
        userId: socket.userId,
        roomId
      });
    });

    socket.on('typing:stop', (data) => {
      const { roomId } = data;
      socket.to(roomId).emit('typing:stop', {
        userId: socket.userId,
        roomId
      });
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
    });

    
    socket.on('error', (error) => {
      console.error(`Socket error for user ${socket.userId}:`, error);
    });
  });
}

