// src/services/s3Service.js
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
    region: "eu-south-2",
    credentials: {
        accessKeyId: "AKIA6HACQML6T4YSII4Z",
        secretAccessKey: "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"
    }
});

// Función para subir un archivo a S3
export async function uploadToS3({ fileBuffer, fileName, mimeType }) {
    const params = {
        Bucket: "bemotion-s3",
        Key: `img-perfil-user/${fileName}`,
        Body: fileBuffer,
        ContentType: mimeType,
        //ACL: 'public-read' // Si quieres que sea accesible públicamente
    };
    const command = new PutObjectCommand(params);
    await s3.send(command);

    // Construye la URL pública (ajústalo si tu bucket no es público)
    return `https://${params.Bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${params.Key}`;
}
