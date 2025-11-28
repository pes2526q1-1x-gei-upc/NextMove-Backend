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
    // eslint-disable-next-line no-useless-catch
    try {
      user = await authService.verifyToken(token);
    } catch (error) {
      throw error;
    }
  }
  
  // INYECCIÓN HARDCODEADA (solo para pruebas locales)
  // Inyecta el usuario 'bombo13@gmail.com' cuando no exista un usuario autenticado.
  // Quitar o proteger esta sección en entornos de producción.
  /*if (!user) {
    user = {
      email: 'bombo13@gmail.com',
      hardcoded: true,
    };
    // eslint-disable-next-line no-console
    console.warn('[graphql/context] Hardcoded user injected: bombo13@gmail.com');
  }*/

  //DEJADMELO PARA PODER PROBAR EN EL RURU DE FORMA MÁS FÁCIL COSAS DE RECORRIDOS. 

  return {
    user,           // Usuario autenticado (null si no hay token válido)
    authService,    // Servicio de autenticación
    req,            // Request original
    res,            // Response original
  };
}

