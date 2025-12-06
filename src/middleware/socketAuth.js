// src/middleware/socketAuth.js
import admin from "firebase-admin";
export async function socketAuthMiddleware(socket, next) {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    // Verificar token con Firebase Admin
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Adjuntar info del usuario al socket
    socket.userId = decodedToken.uid;
    socket.userEmail = decodedToken.email;
    
    console.log(`Socket authenticated for user: ${socket.userId}`);
    next();
  } catch (error) {
    console.error('Socket authentication error:', error.message);
    next(new Error('Invalid authentication token'));
  }
}
