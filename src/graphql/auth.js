/**
 * Verifica que el usuario esté autenticado
 * Lanza error si no hay usuario en el contexto
 * @param {object} context - Contexto de GraphQL
 * @returns {object} - Usuario autenticado
 * @throws {Error} - Si no está autenticado
 */
export function requireAuth(context) {
  if (!context.user) {
    throw new Error('No autenticado. Debes iniciar sesión.');
  }
  return context.user;
}

/**
 * Verifica que el email del usuario esté verificado
 * @param {object} context - Contexto de GraphQL
 * @returns {object} - Usuario autenticado con email verificado
 * @throws {Error} - Si el email no está verificado
 */
export function requireVerifiedEmail(context) {
  const user = requireAuth(context);
  
  if (!user.emailVerified) {
    throw new Error('Debes verificar tu email antes de realizar esta acción.');
  }
  
  return user;
}

/**
 * Verifica que el usuario sea el propietario del recurso
 * @param {object} context - Contexto de GraphQL
 * @param {string} resourceUid - UID del propietario del recurso
 * @returns {object} - Usuario autenticado
 * @throws {Error} - Si no es el propietario
 */
export function requireOwnership(context, resourceUid) {
  const user = requireAuth(context);
  
  if (user.uid !== resourceUid) {
    throw new Error('No tienes permiso para realizar esta acción.');
  }
  
  return user;
}

/**
 * Verifica autenticación opcional
 * No lanza error si no está autenticado, solo retorna null
 * @param {object} context - Contexto de GraphQL
 * @returns {object|null} - Usuario autenticado o null
 */
export function optionalAuth(context) {
  return context.user || null;
}