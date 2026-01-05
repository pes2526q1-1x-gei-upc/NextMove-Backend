import express from 'express';
import BanService from '../services/BanService.js';
import { requireApiKey } from '../middleware/auth.js';

const router = express.Router();

// Aplicar autenticación con API Key a todas las rutas
router.use(requireApiKey);

/**
 * POST /api/ban/ban-user
 * Banea un usuario
 * Body: { email: string, reason: string, description?: string, bannedUntil?: string (ISO date), isPermanent?: boolean }
 */
router.post('/ban-user', async (req, res) => {
  try {
    const { email, reason, description, bannedUntil, isPermanent } = req.body;

    if (!email || !reason) {
      return res.status(400).json({
        success: false,
        error: 'Email y razón son obligatorios',
      });
    }

    // Convertir bannedUntil a Date si es string
    let bannedUntilDate = null;
    if (bannedUntil && !isPermanent) {
      bannedUntilDate = new Date(bannedUntil);
      if (isNaN(bannedUntilDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'bannedUntil debe ser una fecha válida en formato ISO',
        });
      }
    }

    await BanService.banUser(email, {
      reason,
      description,
      bannedUntil: bannedUntilDate,
      isPermanent: isPermanent || false,
    });

    res.json({
      success: true,
      message: `Usuario ${email} baneado exitosamente`,
    });
  } catch (error) {
    console.error('Error baneando usuario:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al banear usuario',
    });
  }
});

/**
 * POST /api/ban/unban-user
 * Desbanea un usuario
 * Body: { email: string }
 */
router.post('/unban-user', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email es obligatorio',
      });
    }

    await BanService.unbanUser(email);

    res.json({
      success: true,
      message: `Usuario ${email} desbaneado exitosamente`,
    });
  } catch (error) {
    console.error('Error desbaneando usuario:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al desbanear usuario',
    });
  }
});

export default router;

