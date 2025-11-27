import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

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
      const { username, password } = req.body;
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
      const { adminId, name, email, username, password, cnpjCpf, phone, address } = req.body;
      const { createClient } = await import("../db");
      const { hashPassword } = await import("../adminAuth");
      
      const hashedPassword = await hashPassword(password);
      await createClient({
        adminId,
        name,
        email,
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
  
  // Upload document for client
  app.post("/api/admin-documents/upload", async (req, res) => {
    try {
      const { clientId, adminId, title, description, documentType, fileBase64, fileName, mimeType } = req.body;
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
