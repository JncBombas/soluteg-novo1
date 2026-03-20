import { v2 as cloudinary } from 'cloudinary';
import { ENV } from './_core/env';

// Configuração (Pegue os dados no painel do Cloudinary)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME, // Ex: jnc-eletrica
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "os_attachments", // Organiza em pastas no Cloudinary
        resource_type: "auto",
        transformation: [{ quality: "auto", fetch_format: "auto" }] // Comprime sozinho!
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          key: result!.public_id,
          url: result!.secure_url, // Link profissional HTTPS
        });
      }
    );

    // Converte e envia o arquivo
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data as any);
    uploadStream.end(buffer);
  });
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string; }> {
  // No Cloudinary, o link já é retornado no 'put', mas mantemos por compatibilidade
  return { key: relKey, url: cloudinary.url(relKey) };
}