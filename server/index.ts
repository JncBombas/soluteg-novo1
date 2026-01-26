import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "../vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  
  // Client login API
  app.post("/api/client-login", async (req, res) => {
    try {
      const { clientLoginSchema } = await import("../validation");
      const validation = clientLoginSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ message: "Dados inválidos", errors: validation.error.flatten() });
      }
      
      const { username, password } = validation.data;
      const { getClientByUsername, updateClientLastLogin } = await import("../db");
      const { comparePassword } = await import("../adminAuth");
      
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
      
      // Bloquear login de clientes sem acesso ao portal
      if (client.type === "sem_portal") {
        return res.status(403).json({ message: "Este cliente não possui acesso ao portal. Entre em contato com o administrador." });
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
  
  // Get client documents
  app.get("/api/client-documents", async (req, res) => {
    try {
      const clientId = req.query.clientId as string;
      if (!clientId) {
        return res.status(400).json({ message: "clientId é obrigatório" });
      }
      
      const { getDocumentsByClientId } = await import("../db");
      const documents = await getDocumentsByClientId(parseInt(clientId));
      res.json(documents);
    } catch (error) {
      console.error("Get documents error:", error);
      res.status(500).json({ message: "Erro ao carregar documentos" });
    }
  });
  
  // Delete client document
  app.delete("/api/client-documents/:id", async (req, res) => {
    try {
      const { deleteClientDocument } = await import("../db");
      await deleteClientDocument(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error("Delete document error:", error);
      res.status(500).json({ message: "Erro ao deletar documento" });
    }
  });
  
  // Get admin clients
  app.get("/api/admin-clients", async (req, res) => {
    try {
      const adminId = req.query.adminId as string;
      if (!adminId) {
        return res.status(400).json({ message: "adminId é obrigatório" });
      }
      
      const { getClientsByAdminId } = await import("../db");
      const clients = await getClientsByAdminId(parseInt(adminId));
      res.json(clients);
    } catch (error) {
      console.error("Get admin clients error:", error);
      res.status(500).json({ message: "Erro ao carregar clientes" });
    }
  });
  
  // Create admin client
  app.post("/api/admin-clients", async (req, res) => {
    try {
      const { createClientSchema } = await import("../validation");
      const validation = createClientSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ message: "Dados inválidos", errors: validation.error.flatten() });
      }
      
      const { adminId, name, email, username, password, cnpjCpf, phone, address, type } = validation.data;
      const { createClient } = await import("../db");
      const { hashPassword } = await import("../adminAuth");
      
      const hashedPassword = await hashPassword(password);
      await createClient({
        adminId,
        name,
        email: email || undefined,
        username,
        password: hashedPassword,
        cnpjCpf,
        phone,
        address,
        active: 1,
      });
      
      res.json({ success: true, message: "Cliente criado com sucesso" });
    } catch (error) {
      console.error("Create client error:", error);
      res.status(500).json({ message: "Erro ao criar cliente" });
    }
  });
  
  // Get admin client by ID
  app.get("/api/admin-clients/:id", async (req, res) => {
    try {
      const { getClientById } = await import("../db");
      const client = await getClientById(parseInt(req.params.id));
      
      if (!client) {
        return res.status(404).json({ message: "Cliente não encontrado" });
      }
      
      res.json(client);
    } catch (error) {
      console.error("Get client error:", error);
      res.status(500).json({ message: "Erro ao carregar cliente" });
    }
  });
  
  // Update admin client
  app.put("/api/admin-clients/:id", async (req, res) => {
    try {
      const { updateClientSchema } = await import("../validation");
      const validation = updateClientSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ message: "Dados inválidos", errors: validation.error.flatten() });
      }
      
      const { name, email, username, cnpjCpf, phone, address, type } = validation.data;
      const { updateClient } = await import("../db");
      
      await updateClient(parseInt(req.params.id), {
        name,
        email: email || undefined,
        username,
        cnpjCpf,
        phone,
        address,
        type,
      });
      
      res.json({ success: true, message: "Cliente atualizado com sucesso" });
    } catch (error) {
      console.error("Update client error:", error);
      res.status(500).json({ message: "Erro ao atualizar cliente" });
    }
  });
  
  // Delete admin client
  app.delete("/api/admin-clients/:id", async (req, res) => {
    try {
      const { deleteClient } = await import("../db");
      await deleteClient(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error("Delete client error:", error);
      res.status(500).json({ message: "Erro ao deletar cliente" });
    }
  });
  
  // Get work order by ID
  app.get("/api/work-orders/:id", async (req, res) => {
    try {
      const { getWorkOrderById } = await import("../db");
      const workOrder = await getWorkOrderById(parseInt(req.params.id));
      
      if (!workOrder) {
        return res.status(404).json({ message: "Ordem de servico nao encontrada" });
      }
      
      res.json(workOrder);
    } catch (error) {
      console.error("Get work order error:", error);
      res.status(500).json({ message: "Erro ao carregar ordem de servico" });
    }
  });
  
  // Update work order
  app.put("/api/work-orders/:id", async (req, res) => {
    try {
      // Validacao basica
      if (!req.params.id || isNaN(parseInt(req.params.id))) {
        return res.status(400).json({ message: "ID da ordem de servico invalido" });
      }
      
      const validStatuses = ["aberta", "em_andamento", "concluida", "cancelada"];
      const validPriorities = ["normal", "alta", "critica"];
      
      if (req.body.status && !validStatuses.includes(req.body.status)) {
        return res.status(400).json({ message: "Status invalido" });
      }
      
      if (req.body.priority && !validPriorities.includes(req.body.priority)) {
        return res.status(400).json({ message: "Prioridade invalida" });
      }
      
      const { title, description, serviceType, status, priority, estimatedHours, actualHours } = req.body;
      const { updateWorkOrder } = await import("../db");
      
      await updateWorkOrder(parseInt(req.params.id), {
        title,
        description,
        serviceType,
        status,
        priority,
        estimatedHours: estimatedHours ? parseInt(estimatedHours) : null,
        actualHours: actualHours ? parseInt(actualHours) : null,
        updatedAt: new Date(),
      });
      
      res.json({ success: true, message: "Ordem de servico atualizada com sucesso" });
    } catch (error) {
      console.error("Update work order error:", error);
      res.status(500).json({ message: "Erro ao atualizar ordem de servico" });
    }
  });
  
  // Create work order (for clients)
  app.post("/api/work-orders", async (req, res) => {
    try {
      // Validacao basica
      const { clientId, title, description, serviceType } = req.body;
      
      if (!clientId || !title) {
        return res.status(400).json({ message: "Campos obrigatorios faltando" });
      }
      
      if (isNaN(parseInt(clientId))) {
        return res.status(400).json({ message: "ID do cliente invalido" });
      }
      const { createWorkOrder, getNextOSNumber } = await import("../db");
      
      const osNumber = await getNextOSNumber();
      
      const result = await createWorkOrder({
        adminId: 1,
        clientId,
        osNumber,
        type: "emergencial",
        title,
        description,
        serviceType,
        status: "aberta",
        priority: "normal",
      });
      
      res.json({ success: true, message: "Ordem de servico criada com sucesso", osNumber });
    } catch (error) {
      console.error("Create work order error:", error);
      res.status(500).json({ message: "Erro ao criar ordem de servico" });
    }
  });
  
  // Upload document for client
  app.post("/api/admin-documents/upload", async (req, res) => {
    try {
      // Validacao basica dos campos obrigatorios
      const { clientId, adminId, title, description, documentType, fileBase64, fileName, mimeType } = req.body;
      
      if (!clientId || !adminId || !title || !documentType || !fileBase64 || !fileName) {
        return res.status(400).json({ message: "Campos obrigatorios faltando" });
      }
      
      // Validar tipo de documento
      const validTypes = ["vistoria", "visita", "nota_fiscal", "servico", "relatorio_servico", "relatorio_visita", "outro"];
      if (!validTypes.includes(documentType)) {
        return res.status(400).json({ message: "Tipo de documento invalido" });
      }
      const { createClientDocument } = await import("../db");
      const { storagePut } = await import("../storage");
      
      const buffer = Buffer.from(fileBase64, "base64");
      const fileKey = `clients/${clientId}/${Date.now()}-${fileName}`;
      
      const { url } = await storagePut(fileKey, buffer, mimeType || "application/octet-stream");
      
      await createClientDocument({
        clientId,
        adminId,
        title,
        description,
        documentType,
        fileUrl: url,
        fileKey,
        fileSize: buffer.length,
        mimeType,
      });
      
      res.json({ success: true, message: "Documento enviado com sucesso", url });
    } catch (error) {
      console.error("Upload document error:", error);
      res.status(500).json({ message: "Erro ao fazer upload do documento" });
    }
  });
  
  // Get admin metrics
  app.get("/api/admin-metrics", async (req, res) => {
    try {
      const adminId = req.query.adminId as string;
      if (!adminId) {
        return res.status(400).json({ message: "adminId eh obrigatorio" });
      }
      
      const { getClientsByAdminId, getWorkOrdersByAdminId, getAllDocumentsByAdminId } = await import("../db");
      const clients = await getClientsByAdminId(parseInt(adminId));
      const workOrders = await getWorkOrdersByAdminId(parseInt(adminId));
      const documents = await getAllDocumentsByAdminId(parseInt(adminId));
      
      const activeClients = clients.filter(c => c.active === 1).length;
      const openWorkOrders = workOrders.filter(wo => wo.status === "aberta" || wo.status === "em_andamento").length;
      
      res.json({
        totalClients: clients.length,
        activeClients,
        openWorkOrders,
        totalDocuments: documents.length,
      });
    } catch (error) {
      console.error("Get metrics error:", error);
      res.status(500).json({ message: "Erro ao carregar metricas" });
    }
  });
  
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
