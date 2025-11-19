import fs from 'fs';
import path from 'path';
import { uploadToS3 } from './services/s3Services.js';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

console.log('S3 env:', {
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  AWS_REGION: process.env.AWS_REGION
});

// Ruta al archivo de imagen en tu ordenador
const imagePath = path.resolve('./Foto-perfil.jpg');

// El nombre será el mismo, pero puedes cambiarlo (idea: usar uuid o timestamp)
const fileName = `prueba-${Date.now()}.jpg`;

fs.readFile(imagePath, async (err, data) => {
  if (err) {
    console.error('No se pudo leer la imagen:', err);
    return;
  }
  try {
    const url = await uploadToS3({
      fileBuffer: data,
      fileName,
      mimeType: 'image/jpeg', // Cambia si usas otro tipo de archivo
    });
    console.log('Imagen subida con éxito. URL:', url);
  } catch (error) {
    console.error('Error al subir a S3:', error);
  }
});
