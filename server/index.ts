// ============================================================
// 📁 ARQUIVO: index.ts
// 🎯 FUNÇÃO: Arquivo principal do servidor da JNC Elétrica.
//    Ele "liga" o servidor, registra todas as rotas (endereços
//    que o sistema responde) e conecta o banco de dados.
// ============================================================
 
import "dotenv/config";        // Carrega variáveis de ambiente (.env), como senhas e chaves secretas
import express from "express"; // Framework que cria o servidor web
import { createServer } from "http"; // Cria o servidor HTTP nativo do Node.js
import multer from "multer";   // Biblioteca para receber arquivos (fotos, PDFs) via upload
import { createExpressMiddleware } from "@trpc/server/adapters/express"; // Integração com tRPC (camada de API tipada)
import { registerOAuthRoutes } from "./_core/oauth";   // Rotas de autenticação OAuth (login com Google, etc.)
import { appRouter } from "./routers";                 // Todas as rotas tRPC do sistema
import { createContext } from "./_core/context";       // Contexto compartilhado entre as requisições
import { setupVite, serveStatic } from "./vite";       // Configuração do frontend (React)
 
// ============================================================
// 📦 CONFIGURAÇÃO DO MULTER (Gerenciador de Upload de Arquivos)
// O multer intercepta arquivos enviados pelo usuário.
// "memoryStorage" significa que o arquivo fica na RAM
// temporariamente, antes de ser enviado para o Cloudinary.
// ============================================================
const upload = multer({ storage: multer.memoryStorage() });
 
 
// ============================================================
// 🚀 FUNÇÃO PRINCIPAL: Inicia o servidor
// Tudo dentro dessa função só roda quando o sistema é ligado.
// ============================================================
async function startServer() {
  const app = express();              // Cria a aplicação Express
  const server = createServer(app);   // Cria o servidor HTTP com base na aplicação
 
  // ----------------------------------------------------------
  // ⚙️ CONFIGURAÇÕES GLOBAIS
  // Define o tamanho máximo de dados que o servidor aceita.
  // 50mb é importante para fotos de alta resolução não serem
  // bloqueadas antes de chegar na rota de upload.
  // ----------------------------------------------------------
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
 
  // Registra as rotas de login OAuth (ex: "Entrar com Google")
  registerOAuthRoutes(app);
 
 
  // ============================================================
  // 📸 ROTA: Upload Múltiplo de Fotos/PDFs
  // Endereço: POST /api/work-orders/upload
  //
  // Como funciona:
  //   1. O frontend envia os arquivos nessa rota
  //   2. O multer intercepta e coloca os arquivos na memória RAM
  //   3. Cada arquivo é enviado para o Cloudinary (armazenamento na nuvem)
  //   4. Os links (URLs) dos arquivos são retornados para o frontend salvar
  //
  // upload.array('files', 10) → aceita até 10 arquivos de uma vez,
  // com o nome de campo "files" no formulário.
  // ============================================================
  app.post("/api/work-orders/upload", upload.array('files', 10), async (req, res) => {
    try {
      // req.files contém os arquivos que chegaram na requisição
      const files = req.files as Express.Multer.File[];
 
      // Log útil para monitorar no terminal (pm2 logs)
      console.log(`[JNC Upload] Recebidos ${files?.length || 0} arquivos.`);
 
      // Se não veio nenhum arquivo, retorna erro 400 (Bad Request)
      if (!files || files.length === 0) {
        return res.status(400).json({ success: false, message: "Nenhum arquivo enviado" });
      }
 
      // Importa a função de salvar arquivos na nuvem (Cloudinary)
      const { storagePut } = await import("./storage");
 
      // Sobe TODOS os arquivos ao mesmo tempo (em paralelo) para economizar tempo
      // Promise.all → espera todas as operações terminarem antes de continuar
      const uploadPromises = files.map(async (file) => {
        // Envia o arquivo para o Cloudinary e recebe a URL pública de volta
        const { url, key } = await storagePut(
          file.originalname, // Nome original do arquivo (ex: "foto_quadro.jpg")
          file.buffer,       // Conteúdo do arquivo em bytes (vem da memória RAM)
          file.mimetype      // Tipo do arquivo (ex: "image/jpeg", "application/pdf")
        );
 
        // Retorna um objeto com as informações do arquivo já salvo na nuvem
        return {
          url,                        // Link público para acessar o arquivo
          key,                        // Identificador único no Cloudinary
          fileName: file.originalname, // Nome original
          fileType: file.mimetype,     // Tipo (imagem, pdf, etc.)
          fileSize: file.size          // Tamanho em bytes
        };
      });
 
      // Aguarda todos os uploads terminarem
      const results = await Promise.all(uploadPromises);
 
      // Retorna os dados para o frontend (componente WorkOrderAttachments.tsx)
      // 'urls' é um array com as informações de cada arquivo enviado
      res.json({
        success: true,
        urls: results
      });
 
    } catch (error: any) {
      // Se qualquer coisa der errado, registra o erro e avisa o frontend
      console.error("Erro no upload JNC:", error);
      res.status(500).json({ success: false, message: error.message || "Erro no processamento" });
    }
  });
 
 
  // ============================================================
  // 🔑 ROTA: Login do Cliente (Portal do Cliente)
  // Endereço: POST /api/client-login
  //
  // Recebe usuário e senha, valida, e retorna um token de acesso.
  // ============================================================
  app.post("/api/client-login", async (req, res) => {
    try {
      // Valida se os dados enviados têm o formato correto (usuário e senha)
      const { clientLoginSchema } = await import("./validation");
      const validation = clientLoginSchema.safeParse(req.body);
 
      if (!validation.success) {
        // Dados mal formatados (ex: senha em branco)
        return res.status(400).json({ message: "Dados inválidos", errors: validation.error.flatten() });
      }
 
      const { username, password } = validation.data;
 
      // Importa as funções necessárias do banco de dados e autenticação
      const { getClientByUsername, updateClientLastLogin } = await import("./db");
      const { comparePassword } = await import("./adminAuth");
 
      // Busca o cliente no banco pelo nome de usuário
      const client = await getClientByUsername(username);
      if (!client) {
        // Usuário não existe — usamos mensagem genérica por segurança
        return res.status(401).json({ message: "Usuário ou senha inválidos" });
      }
 
      // Compara a senha enviada com o hash salvo no banco
      const isValid = await comparePassword(password, client.password);
      if (!isValid) {
        // Senha errada
        return res.status(401).json({ message: "Usuário ou senha inválidos" });
      }
 
      // Verifica se o cadastro do cliente está ativo
      if (!client.active) {
        return res.status(403).json({ message: "Cliente inativo" });
      }
 
      // Regra da JNC: clientes do tipo "sem_portal" não podem acessar o portal
      if (client.type === "sem_portal") {
        return res.status(403).json({ message: "Este cliente não possui acesso ao portal." });
      }
 
      // Atualiza a data/hora do último login no banco
      await updateClientLastLogin(client.id);
 
      // Retorna o token de sessão e dados básicos do cliente
      res.json({
        success: true,
        token: `client-${client.id}`, // Token simples baseado no ID do cliente
        clientId: client.id,
        name: client.name,
      });
 
    } catch (error) {
      console.error("Client login error:", error);
      res.status(500).json({ message: "Erro ao fazer login" });
    }
  });
 
 
  // ============================================================
  // 📄 ROTA: Listar Documentos de um Cliente
  // Endereço: GET /api/client-documents?clientId=123
  //
  // Retorna todos os documentos (contratos, laudos, etc.)
  // vinculados a um cliente específico.
  // ============================================================
  app.get("/api/client-documents", async (req, res) => {
    try {
      // clientId vem como parâmetro na URL: ?clientId=123
      const clientId = req.query.clientId as string;
 
      if (!clientId) {
        return res.status(400).json({ message: "clientId é obrigatório" });
      }
 
      const { getDocumentsByClientId } = await import("./db");
      const documents = await getDocumentsByClientId(parseInt(clientId));
 
      res.json(documents); // Retorna a lista de documentos em formato JSON
 
    } catch (error) {
      res.status(500).json({ message: "Erro ao carregar documentos" });
    }
  });
 
 
  // ============================================================
  // 🗑️ ROTA: Deletar um Documento
  // Endereço: DELETE /api/client-documents/456
  //
  // Remove um documento do banco de dados pelo ID.
  // ============================================================
  app.delete("/api/client-documents/:id", async (req, res) => {
    try {
      const { deleteClientDocument } = await import("./db");
 
      // req.params.id → pega o número da URL (ex: /client-documents/456 → id = 456)
      await deleteClientDocument(parseInt(req.params.id));
 
      res.json({ success: true });
 
    } catch (error) {
      res.status(500).json({ message: "Erro ao deletar documento" });
    }
  });
 
 
  // ============================================================
  // 🔍 ROTA: Buscar uma Ordem de Serviço pelo ID
  // Endereço: GET /api/work-orders/789
  //
  // Retorna os dados completos de uma OS específica.
  // ============================================================
  app.get("/api/work-orders/:id", async (req, res) => {
    try {
      const { getWorkOrderById } = await import("./db");
      const workOrder = await getWorkOrderById(parseInt(req.params.id));
 
      if (!workOrder) {
        // OS não encontrada no banco
        return res.status(404).json({ message: "OS não encontrada" });
      }
 
      res.json(workOrder);
 
    } catch (error) {
      res.status(500).json({ message: "Erro ao carregar OS" });
    }
  });
 
 
  // ============================================================
  // 📡 INTEGRAÇÃO tRPC (Lógica Principal do Sistema)
  // Endereço: /api/trpc/*
  //
  // O tRPC é a camada que conecta o frontend React com o backend
  // de forma tipada e segura. A maioria das operações do sistema
  // (criar OS, listar clientes, etc.) passa por aqui.
  // ============================================================
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,    // Todas as rotas tRPC definidas em ./routers
      createContext,        // Contexto da requisição (usuário logado, banco de dados, etc.)
    })
  );
 
 
  // ============================================================
  // 🖥️ CONFIGURAÇÃO DO FRONTEND (React/Vite)
  //
  // Em desenvolvimento: usa o Vite com hot reload (atualiza
  //   automaticamente ao salvar o código)
  // Em produção: serve os arquivos estáticos já compilados
  // ============================================================
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server); // Modo dev com hot reload
  } else {
    serveStatic(app); // Modo produção: arquivos estáticos
  }
 
 
  // ============================================================
  // ▶️ INICIA O SERVIDOR
  // Porta 3000 | Aceita conexões de qualquer IP (0.0.0.0)
  // ============================================================
  const PORT = 3000;
  server.listen(PORT, "0.0.0.0", () => {
    console.log("=========================================");
    console.log(`🚀 SERVIDOR JNC ELÉTRICA RODANDO`);
    console.log(`- Acesse: http://jnc.soluteg.com.br`);
    console.log("=========================================");
  });
}
 
// Inicia tudo — se der erro grave na inicialização, mostra no console
startServer().catch(console.error);