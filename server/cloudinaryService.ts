import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';

// Configure com as suas credenciais do painel do Cloudinary
cloudinary.config({
  cloud_name: 'seu_cloud_name',
  api_key: 'sua_api_key',
  api_secret: 'sua_api_secret',
});

/**
 * Função que recebe o buffer do Multer e envia para o Cloudinary
 */
export const uploadToCloudinary = (fileBuffer: Buffer): Promise<string> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'jnc_sistema/ordens_servico', // Pasta organizada no Cloudinary
        transformation: [
          { width: 1000, crop: "limit", quality: "auto" } // Redimensiona para não ficar pesado no PDF
        ]
      },
      (error, result) => {
        if (error) return reject(error);
        if (result) resolve(result.secure_url); // Retorna a URL da imagem
      }
    );

    // Converte o Buffer em Stream e envia
    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
};