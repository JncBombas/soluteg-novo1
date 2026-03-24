
import multer from 'multer';
import path from 'path';

// Configuração de armazenamento temporário em memória (ideal para enviar para o Cloudinary depois)
const storage = multer.memoryStorage();

export const upload = multer({
  storage: storage,
  limits: {
    // 10MB por foto individual (mantido)
    fileSize: 10 * 1024 * 1024, 
    // 🔥 ADICIONE ISSO: 50MB para a soma de todas as fotos no envio
    fieldSize: 50 * 1024 * 1024,
    // 🔥 ADICIONE ISSO: Limite explícito de 10 arquivos
    files: 10 
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp|pdf/; // Adicionei PDF caso precise de laudos
    const mimeType = allowedTypes.test(file.mimetype);
    const extName = allowedTypes.test(path.extname(file.originalname).toLowerCase());

    if (mimeType && extName) {
      return cb(null, true);
    }
    cb(new Error("Apenas imagens e PDFs são permitidos!"));
  }
});