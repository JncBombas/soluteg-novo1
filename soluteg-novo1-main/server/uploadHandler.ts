import { Request, Response } from "express";
import multer from "multer";
import { storagePut } from "./storage";
import * as workOrdersAuxDb from "./workOrdersAuxDb";

// Configurar multer para upload em memória
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

export const uploadMiddleware = upload.single("file");

export async function handleAttachmentUpload(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo enviado" });
    }

    const { workOrderId, category, description } = req.body;

    if (!workOrderId) {
      return res.status(400).json({ error: "workOrderId é obrigatório" });
    }

    // Gerar nome único para o arquivo
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(7);
    const fileExtension = req.file.originalname.split(".").pop();
    const fileName = `wo-${workOrderId}/${timestamp}-${randomSuffix}.${fileExtension}`;

    // Upload para S3
    const { url } = await storagePut(
      fileName,
      req.file.buffer,
      req.file.mimetype
    );

    // Salvar no banco de dados
    const attachment = await workOrdersAuxDb.createAttachment({
      workOrderId: parseInt(workOrderId),
      fileName: req.file.originalname,
      fileKey: fileName,
      fileUrl: url,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      category: category || "outro",
    });

    return res.json({
      success: true,
      attachment,
    });
  } catch (error: any) {
    console.error("[Upload] Error:", error);
    return res.status(500).json({
      error: error.message || "Erro ao fazer upload do arquivo",
    });
  }
}
