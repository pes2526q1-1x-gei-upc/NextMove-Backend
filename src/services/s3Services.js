import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { fromEnv } from "@aws-sdk/credential-providers";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: fromEnv(), // Carga desde variables entorno automáticamente
});

export async function uploadToS3({ fileBuffer, fileName, mimeType }) {
  const params = {
    Bucket: `bemotion-s3`,
    Key: `img-perfil-user/${fileName}`,
    Body: fileBuffer,
    ContentType: mimeType,
  };
  const command = new PutObjectCommand(params);
  await s3.send(command);

  return `https://${params.Bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${params.Key}`;
}
