import authService from '../services/AuthService.js';

export const requireApiKey = async (req, res, next) => {
  try {
    // console.log('[AUTH MIDDLEWARE] Headers recibidos:', req.headers);
    
    const apiKey = req.headers['x-api-key'];
    console.log('[AUTH MIDDLEWARE] API Key recibida:', apiKey);

    if (!apiKey) {
      console.log('[AUTH MIDDLEWARE] No hay API key');
      return res.status(401).json({
        success: false,
        error: 'Se requiere API key. Incluye el header X-API-Key con tu clave de acceso.'
      });
    }

    const company = await authService.verifyApiKey(apiKey);

    if (!company) {
      console.log('[AUTH MIDDLEWARE] API key inválida');
      return res.status(401).json({
        success: false,
        error: 'API key inválida o no existe.'
      });
    }

    req.company = company;
    next();

  } catch (error) {
    console.error('[AUTH MIDDLEWARE] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Error verificando API key'
    });
  }
};