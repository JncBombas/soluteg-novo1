import multer from 'multer';
import path from 'path';

// Configuração de armazenamento temporário em memória (ideal para enviar para o Cloudinary depois)
const storage = multer.memoryStorage();

export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // Limite de 10MB por foto (totalizando os 50MB que liberamos no Nginx)
  },
  fileFilter: (req, file, cb) => {
    // Aceitar apenas imagens para o relatório da JNC
    const allowedTypes = /jpeg|jpg|png|webp/;
    const mimeType = allowedTypes.test(file.mimetype);
    const extName = allowedTypes.test(path.extname(file.originalname).toLowerCase());

    if (mimeType && extName) {
      return cb(null, true);
    }
    cb(new Error("Apenas imagens são permitidas!"));
  }
});