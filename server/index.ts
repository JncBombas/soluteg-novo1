import "dotenv/config";
import express from "express";
import uploadHandler from './routes/uploadHandler'; // Ajuste o caminho se necessário
import { createServer } from "http";
import multer from "multer"; // 📦 NOVO: Biblioteca para aceitar arquivos (fotos/PDFs)
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./_core/oauth";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";
import { setupVite, serveStatic } from "./vite";

// Configuração do Multer: ele vai guardar a foto temporariamente na memória RAM
// para processarmos e enviarmos para a nuvem (Cloudinary) logo em seguida.
const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Aumenta o limite para aceitar textos grandes (JSON)
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  registerOAuthRoutes(app);

  // -----------------------------------------------------------
  // 📸 ROTA TURBINADA: Upload Múltiplo de Fotos (JNC Elétrica)
  // Agora aceita até 10 fotos de uma vez do celular do técnico.
  // -----------------------------------------------------------
  app.post("/api/work-orders/upload", upload.array('files', 10), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];

      // 🚧 CHECK DE SEGURANÇA: Se não veio nada, avisa.
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "Nenhum arquivo enviado" });
      }

     // 📸 ROTA CORRIGIDA PARA MÚLTIPLOS ARQUIVOS (JNC)
app.post("/api/work-orders/upload", upload.array('files', 10), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];

    // Log para você ver no 'pm2 logs' se os arquivos chegaram
    console.log(`[JNC Upload] Recebidos ${files?.length || 0} arquivos.`);

    if (!files || files.length === 0) {
      return res.status(400).json({ message: "Nenhum arquivo enviado" });
    }

    const { storagePut } = await import("./storage");
    
    // Processamento paralelo para ganhar tempo
    const uploadPromises = files.map(async (file) => {
      // Aqui usamos a sua função storagePut original
      const { url, key } = await storagePut(
        file.originalname,
        file.buffer,
        file.mimetype
      );
      
      return {
        url,
        key,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size
      };
    });

    const results = await Promise.all(uploadPromises);

    // Retornamos 'urls' (plural) para o seu novo Frontend
    res.json({ 
      success: true, 
      urls: results 
    });

  } catch (error: any) {
    console.error("Erro no upload JNC:", error);
    // Se o Multer barrar por tamanho, ele cai aqui
    res.status(500).json({ message: error.message || "Erro no processamento" });
  }
});

      // Aguarda todas as fotos terminarem de subir para o Cloudinary
      const results = await Promise.all(uploadPromises);

      // Devolve a lista de links para o React salvar no MySQL da JNC
      res.json({ 
        success: true, 
        urls: results // Agora enviamos um array chamado 'urls'
      });

    } catch (error) {
      console.error("Erro no upload múltiplo JNC:", error);
      res.status(500).json({ message: "Erro ao processar upload das fotos" });
    }
  });

  // -----------------------------------------------------------
  // 🔑 ROTA: Login do Cliente (Portal do Cliente)
  // -----------------------------------------------------------
  app.post("/api/client-login", async (req, res) => {
    try {
      const { clientLoginSchema } = await import("./validation");
      const validation = clientLoginSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ message: "Dados inválidos", errors: validation.error.flatten() });
      }
      
      const { username, password } = validation.data;
      const { getClientByUsername, updateClientLastLogin } = await import("./db");
      const { comparePassword } = await import("./adminAuth");
      
      const client = await getClientByUsername(username);
      if (!client) {
        return res.status(401).json({ message: "Usuário ou senha inválidos" });
      }
      
      const isValid = await comparePassword(password, client.password);
      if (!isValid) {
        return res.status(401).json({ message: "Usuário ou senha inválidos" });
      }
      
      if (!client.active) {
        return res.status(403).json({ message: "Cliente inativo" });
      }
      
      // Regra da JNC: Bloquear login de clientes sem permissão ao portal
      if (client.type === "sem_portal") {
        return res.status(403).json({ message: "Este cliente não possui acesso ao portal." });
      }
      
      await updateClientLastLogin(client.id);
      
      res.json({
        success: true,
        token: `client-${client.id}`,
        clientId: client.id,
        name: client.name,
      });
    } catch (error) {
      console.error("Client login error:", error);
      res.status(500).json({ message: "Erro ao fazer login" });
    }
  });

  // -----------------------------------------------------------
  // 📄 ROTAS DE DOCUMENTOS E CLIENTES (Painel Admin)
  // -----------------------------------------------------------
  
  // Lista documentos de um cliente específico
  app.get("/api/client-documents", async (req, res) => {
    try {
      const clientId = req.query.clientId as string;
      if (!clientId) return res.status(400).json({ message: "clientId é obrigatório" });
      
      const { getDocumentsByClientId } = await import("./db");
      const documents = await getDocumentsByClientId(parseInt(clientId));
      res.json(documents);
    } catch (error) {
      res.status(500).json({ message: "Erro ao carregar documentos" });
    }
  });

  // Deleta um documento do banco de dados
  app.delete("/api/client-documents/:id", async (req, res) => {
    try {
      const { deleteClientDocument } = await import("./db");
      await deleteClientDocument(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Erro ao deletar documento" });
    }
  });

  // Busca Ordem de Serviço por ID (usado na visualização)
  app.get("/api/work-orders/:id", async (req, res) => {
    try {
      const { getWorkOrderById } = await import("./db");
      const workOrder = await getWorkOrderById(parseInt(req.params.id));
      if (!workOrder) return res.status(404).json({ message: "OS não encontrada" });
      res.json(workOrder);
    } catch (error) {
      res.status(500).json({ message: "Erro ao carregar OS" });
    }
  });

  // -----------------------------------------------------------
  // 📡 INTEGRAÇÃO tRPC (Lógica Principal do Sistema)
  // -----------------------------------------------------------
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // Configuração para rodar o site (Frontend)
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const PORT = 3000;
  server.listen(PORT, "0.0.0.0", () => {
    console.log("=========================================");
    console.log(`🚀 SERVIDOR JNC ELÉTRICA RODANDO`);
    console.log(`- Acesse: http://jnc.soluteg.com.br`);
    console.log("=========================================");
  });
}

startServer().catch(console.error);