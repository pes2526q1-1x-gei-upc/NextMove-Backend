import authService from '../services/AuthService.js';

/**
 * Express middleware: Verifica el token Bearer y añade `req.user` con los datos del usuario
 */
export const requireUserAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers?.authorization;
    const token = authService.extractToken(authHeader);
    if (!token) {
      return res.status(401).json({ success: false, error: 'Token de autorización faltante' });
    }

    const user = await authService.verifyToken(token);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Token inválido' });
    }

    // user contiene: { uid, email, emailVerified }
    req.user = user;
    next();
  } catch (error) {
    console.error('[userAuth] Error verificando token:', error);
    return res.status(500).json({ success: false, error: 'Error verificando token' });
  }
};

export default requireUserAuth;
