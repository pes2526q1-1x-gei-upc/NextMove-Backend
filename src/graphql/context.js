// src/graphql/context.js
import authService from '../services/AuthService.js';

/**
 * Crea el contexto de GraphQL con el usuario autenticado
 * @param {object} req - Request de Express
 * @param {object} res - Response de Express
 * @returns {Promise<object>} - Contexto con usuario y servicios
 */
export async function createContext(req, res) {
  const authHeader = req?.headers?.authorization;
  const token = authService.extractToken(authHeader);
  let user = null;
  // console.log(token);
if (token) {
  user = await authService.verifyToken(token);
}

  
  return {
    user,           // Usuario autenticado (null si no hay token válido)
    authService,    // Servicio de autenticación
    req,            // Request original
    res,            // Response original
  };
}