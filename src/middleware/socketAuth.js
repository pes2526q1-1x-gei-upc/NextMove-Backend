// src/middleware/socketAuth.js
import admin from "firebase-admin";
import pool from "../config/database.js";

export async function socketAuthMiddleware(socket, next) {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    // Verificar token con Firebase Admin
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Adjuntar info básica del usuario al socket
    socket.userId = decodedToken.uid;
    socket.userEmail = decodedToken.email;
    
    // Obtener nickname del usuario desde la base de datos
    try {
      const userResult = await pool.query(
        'SELECT nickname FROM users WHERE email = $1',
        [socket.userEmail]
      );
      // Usar nickname si existe, sino usar email como fallback
      socket.userName = userResult.rows[0]?.nickname || socket.userEmail;
    } catch (dbError) {
      console.warn(`[Socket.IO] Error fetching nickname for ${socket.userEmail}:`, dbError.message);
      // Fallback al email si no se puede obtener el nickname
      socket.userName = socket.userEmail;
    }
    
    console.log(`Socket authenticated for user: ${socket.userId} (${socket.userName})`);
    next();
  } catch (error) {
    console.error('Socket authentication error:', error.message);
    next(new Error('Invalid authentication token'));
  }
}
