import { Router } from 'express'; // ADICIONE ISSO
import { upload } from '../config/multer'; // Importa o que você acabou de criar
import { uploadToCloudinary } from '../services/cloudinaryService'; // Sua função que manda pro Cloudinary

const router = Router(); // ADICIONE ISSO

// 'files' é o nome que o seu frontend deve enviar no FormData
// '10' é o máximo de fotos que a JNC vai permitir por vez
router.post('/work-orders/upload', upload.array('files', 10), async (req, res) => {
  try {
    // O Multer coloca os arquivos dentro de req.files
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'Nenhuma foto selecionada.' });
    }

    // MANDANDO TUDO DE UMA VEZ (Múltiplos arquivos)
    const uploadPromises = files.map(file => {
      // Aqui você passa o buffer (o arquivo que está na memória) pro Cloudinary
      return uploadToCloudinary(file.buffer); 
    });

    const urls = await Promise.all(uploadPromises);

    // Agora é só salvar essas URLs no seu banco MySQL vinculado à OS
    // ex: await savePhotosToDb(req.body.workOrderId, urls);

    res.status(200).json({ message: 'Fotos enviadas!', urls });
    
  } catch (error) {
    console.error('Erro no upload da JNC:', error);
    res.status(500).json({ error: 'Falha ao processar imagens.' });
  }
});

export default router; // ADICIONE ISSO PARA PODER USAR NO SERVER.TS