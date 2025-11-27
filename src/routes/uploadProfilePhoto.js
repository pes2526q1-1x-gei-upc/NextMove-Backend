import express from 'express';
import multer from 'multer';
import { uploadToS3 } from '../services/s3Services.js';
import UsersRepository from '../repositories/UsersRepository.js';
import { requireUserAuth } from '../middleware/userAuth.js';

const router = express.Router();
// Configuración simple para subir a memoria con límites y filtro de tipo
const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      cb(new Error('Invalid file type. Only images are allowed.'));
      return;
    }
    cb(null, true);
  }
});

router.post('/upload-profile-photo', requireUserAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.user) return res.status(401).send('No autenticado');

    const file = req.file;
    if (!file) return res.status(400).send('No file uploaded');

    // Usa un nombre único con timestamp o uuid. Prefiero usar el UID si está disponible
    const identity = req.user.uid || req.user.email || 'unknown';
    const fileExt = file.mimetype.split('/').pop() || 'jpg';
    const fileName = `profile-${identity}-${Date.now()}.${fileExt}`;

    const imageUrl = await uploadToS3({
      fileBuffer: file.buffer,
      fileName,
      mimeType: file.mimetype,
    });

    // Actualiza el usuario con la URL
    const usersRepo = new UsersRepository();
    const updatedUser = await usersRepo.updateUser(req.user.email, { photo: imageUrl });

    return res.json({ imageUrl, user: updatedUser });

  } catch (error) {
    console.error('Error uploading profile photo:', error);
    return res.status(500).send('Error uploading image');
  }
});

export default router;
