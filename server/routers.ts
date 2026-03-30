import { sendWhatsappAlert } from "./whatsapp";
import { db } from "./db"; // Certifique-se que o 'db' está importado para buscar o cliente
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from "@trpc/server";
import crypto from "crypto";
import { authenticateAdmin, hashPassword, comparePassword } from "./adminAuth";


export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  reports: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getReportsByUserId(ctx.user.id);
    }),
    
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const report = await db.getReportById(input.id);
        if (!report || report.userId !== ctx.user.id) {
          throw new Error("Report not found or access denied");
        }
        return report;
      }),
    
    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1),
        clientName: z.string().min(1),
        serviceType: z.string().min(1),
        serviceDate: z.date(),
        location: z.string().min(1),
        description: z.string().min(1),
        equipmentDetails: z.string().optional(),
        workPerformed: z.string().min(1),
        partsUsed: z.string().optional(),
        technicianName: z.string().min(1),
        observations: z.string().optional(),
        status: z.enum(["draft", "completed", "reviewed"]).default("draft"),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.createReport({
          ...input,
          userId: ctx.user.id,
        });
        return { success: true };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).optional(),
        clientName: z.string().min(1).optional(),
        serviceType: z.string().min(1).optional(),
        serviceDate: z.date().optional(),
        location: z.string().min(1).optional(),
        description: z.string().min(1).optional(),
        equipmentDetails: z.string().optional(),
        workPerformed: z.string().min(1).optional(),
        partsUsed: z.string().optional(),
        technicianName: z.string().min(1).optional(),
        observations: z.string().optional(),
        status: z.enum(["draft", "completed", "reviewed"]).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        const report = await db.getReportById(id);
        if (!report || report.userId !== ctx.user.id) {
          throw new Error("Report not found or access denied");
        }
        await db.updateReport(id, data);
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const report = await db.getReportById(input.id);
        if (!report || report.userId !== ctx.user.id) {
          throw new Error("Report not found or access denied");
        }
        await db.deleteReport(input.id);
        return { success: true };
      }),
  }),

  users: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can list users" });
      }
      return await db.getAllUsers();
    }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can delete users" });
        }
        await db.deleteUser(input.id);
        return { success: true };
      }),

    updateRole: protectedProcedure
      .input(z.object({ id: z.number(), role: z.enum(["user", "admin"]) }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can update roles" });
        }
        await db.updateUserRole(input.id, input.role);
        return { success: true };
      }),
  }),

  adminAuth: router({
    login: publicProcedure
      .input(z.object({
        username: z.string().min(1),
        password: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        try {
          const result = await authenticateAdmin(input.username, input.password);
          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.setHeader('Set-Cookie', `admin_token=${result.token}; ${Object.entries(cookieOptions).map(([k, v]) => `${k}=${v}`).join('; ')}`);
          return result;
        } catch (error) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: error instanceof Error ? error.message : "Login failed",
          });
        }
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie('admin_token', { ...cookieOptions, maxAge: -1 });
      return { success: true };
    }),

    requestReset: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        const admin = await db.getAdminByEmail(input.email);
        if (!admin) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Admin nao encontrado" });
        }
        const resetToken = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000);
        await db.createPasswordReset(input.email, resetToken, expiresAt);
        return { success: true, message: "Link de reset enviado para seu e-mail" };
      }),

    resetPassword: publicProcedure
      .input(z.object({
        token: z.string(),
        password: z.string().min(6),
      }))
      .mutation(async ({ input }) => {
        const hashedPassword = await hashPassword(input.password);
        await db.updateAdminPassword(1, hashedPassword);
        return { success: true, message: "Senha redefinida com sucesso" };
      }),

    changePassword: publicProcedure
      .input(z.object({
        adminId: z.number(),
        currentPassword: z.string().min(6),
        newPassword: z.string().min(6),
      }))
      .mutation(async ({ input }) => {
        const admin = await db.getAdminById(input.adminId);
        if (!admin) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Admin nao encontrado" });
        }
        
        try {
          await authenticateAdmin(admin.email, input.currentPassword);
        } catch (error) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Senha atual incorreta" });
        }
        
        const hashedPassword = await hashPassword(input.newPassword);
        await db.updateAdminPassword(input.adminId, hashedPassword);
        return { success: true, message: "Senha alterada com sucesso" };
      }),

    updateCustomLabel: publicProcedure
      .input(z.object({
        adminId: z.number(),
        customLabel: z.string().min(1).max(255),
      }))
      .mutation(async ({ input }) => {
        await db.updateAdminCustomLabel(input.adminId, input.customLabel);
        return { success: true, message: "Label customizado atualizado com sucesso" };
      }),
  }),

  clients: router({
  list: publicProcedure
    .input(z.object({
      adminId: z.number(),
      search: z.string().optional(),
    }))
    .query(async ({ input }) => {
      return await db.getClientsByAdminId(input.adminId);
    }),
 
  create: publicProcedure
    .input(z.object({
      adminId: z.number(),
      name: z.string().min(1),
      email: z.string().email().optional().or(z.literal("")),
      username: z.string().max(100).optional().or(z.literal("")),
      password: z.string().optional().or(z.literal("")),
      cnpjCpf: z.string().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      syndicName: z.string().optional(),           // <-- NOVO
      type: z.enum(["com_portal", "sem_portal"]).default("com_portal"),
    }))
    .mutation(async ({ input }) => {
      const { password, username, type, ...clientData } = input;

      if (type === "com_portal") {
        if (!username || username.length < 3) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Nome de usuário é obrigatório para clientes com portal (mínimo 3 caracteres)" });
        }
        if (!password || password.length < 6) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Senha é obrigatória para clientes com portal (mínimo 6 caracteres)" });
        }
      }

      const finalUsername = (type === "sem_portal" && (!username || !username.trim()))
        ? `_sp_${input.adminId}_${Date.now()}`
        : username!;
      const finalPassword = (type === "sem_portal" && (!password || !password.trim()))
        ? Math.random().toString(36) + Math.random().toString(36)
        : password!;

      const hashedPassword = await hashPassword(finalPassword);

      await db.createClient({
        ...clientData,
        username: finalUsername,
        type,
        email: clientData.email || null,
        password: hashedPassword,
        active: 1,
      });

      return { success: true, message: "Cliente criado com sucesso" };
    }),
 
  update: publicProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      // Aceita string vazia (campo limpo) além de email válido
      email: z.union([z.string().email(), z.literal("")]).optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      cnpjCpf: z.string().optional(),
      syndicName: z.string().optional(),
      profilePhoto: z.string().optional(),
      type: z.enum(["com_portal", "sem_portal"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input;
      try {
        await db.updateClient(id, updateData);
        return { success: true, message: "Cliente atualizado com sucesso" };
      } catch (error) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: error instanceof Error ? error.message : "Erro ao atualizar cliente",
        });
      }
    }),
 
  updatePassword: publicProcedure
    .input(z.object({
      id: z.number(),
      newPassword: z.string().min(6),
    }))
    .mutation(async ({ input }) => {
      try {
        const hashedPassword = await hashPassword(input.newPassword);
        await db.updateClientPassword(input.id, hashedPassword);
        return { success: true, message: "Senha atualizada com sucesso" };
      } catch (error) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: error instanceof Error ? error.message : "Erro ao atualizar senha",
        });
      }
    }),
 
  // CORRIGIDO: aceita { id } e também { clientId, adminId } para compatibilidade
  delete: publicProcedure
    .input(z.object({
      id: z.number().optional(),
      clientId: z.number().optional(),
      adminId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const id = input.id ?? input.clientId;
      if (!id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "ID do cliente não informado" });
      }
      await db.deleteClient(id);
      return { success: true, message: "Cliente deletado com sucesso" };
    }),
 
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await db.getClientById(input.id);
    }),
 
  getByUsername: publicProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ input }) => {
      return await db.getClientByUsername(input.username);
    }),

  broadcastMessage: publicProcedure
    .input(z.object({
      adminId: z.number(),
      message: z.string().min(1),
      targetType: z.enum(["all", "com_portal", "sem_portal", "selected"]),
      clientIds: z.array(z.number()).optional(),
    }))
    .mutation(async ({ input }) => {
      const allClients = await db.getClientsByAdminId(input.adminId);

      let targets = allClients;
      if (input.targetType === "com_portal") {
        targets = allClients.filter(c => c.type === "com_portal");
      } else if (input.targetType === "sem_portal") {
        targets = allClients.filter(c => c.type === "sem_portal");
      } else if (input.targetType === "selected") {
        const ids = new Set(input.clientIds ?? []);
        targets = allClients.filter(c => ids.has(c.id));
      }

      const { sendWhatsappToNumber } = await import("./whatsapp");

      const results: Array<{ id: number; name: string; phone: string; status: "sent" | "failed" | "skipped"; reason?: string }> = [];

      for (const client of targets) {
        if (!client.phone) {
          results.push({ id: client.id, name: client.name, phone: "", status: "skipped", reason: "Sem telefone cadastrado" });
          continue;
        }
        try {
          await sendWhatsappToNumber(client.phone, input.message);
          results.push({ id: client.id, name: client.name, phone: client.phone, status: "sent" });
        } catch (err: any) {
          results.push({ id: client.id, name: client.name, phone: client.phone, status: "failed", reason: err?.message ?? "Erro desconhecido" });
        }
      }

      const sent = results.filter(r => r.status === "sent").length;
      const failed = results.filter(r => r.status === "failed").length;
      const skipped = results.filter(r => r.status === "skipped").length;

      return { total: targets.length, sent, failed, skipped, results };
    }),
}),

  documents: router({
    list: publicProcedure
      .input(z.object({ 
        clientId: z.number(),
        search: z.string().optional(),
        documentType: z.enum(["vistoria", "visita", "nota_fiscal", "servico", "relatorio_servico", "relatorio_visita", "all"]).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }))
      .query(async ({ input }) => {
        return await db.getDocumentsByClientIdWithFilters(input);
      }),

    listAll: publicProcedure
      .input(z.object({ 
        adminId: z.number(),
        search: z.string().optional(),
        clientId: z.number().optional(),
        documentType: z.enum(["relatorio_servico", "relatorio_visita", "nota_fiscal", "outro", "all"]).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }))
      .query(async ({ input }) => {
        return await db.getAllDocumentsWithFilters(input);
      }),

    create: publicProcedure
      .input(z.object({
        clientId: z.number(),
        adminId: z.number(),
        title: z.string().min(1),
        description: z.string().optional(),
        documentType: z.enum(["vistoria", "visita", "nota_fiscal", "servico", "relatorio_servico", "relatorio_visita"]),
        fileUrl: z.string().url(),
        fileKey: z.string(),
        fileSize: z.number().optional(),
        mimeType: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const result = await db.createClientDocument(input);
        return { success: true, message: "Documento enviado com sucesso" };
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteClientDocument(input.id);
        return { success: true, message: "Documento deletado com sucesso" };
      }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getDocumentById(input.id);
      }),
  }),

  clientProfile: router({
    getProfile: publicProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }) => {
        const client = await db.getClientById(input.clientId);
        if (!client) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Cliente nao encontrado" });
        }
        return {
          id: client.id,
          name: client.name,
          email: client.email,
          phone: client.phone,
          cnpjCpf: client.cnpjCpf,
          address: client.address,
          syndicName: client.syndicName,
          profilePhoto: client.profilePhoto,
          username: client.username,
        };
      }),

    uploadPhoto: publicProcedure
      .input(z.object({
        clientId: z.number(),
        imageBase64: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { storagePut } = await import("./storage");
        const base64Data = input.imageBase64.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        if (buffer.length > 5 * 1024 * 1024) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Imagem muito grande. Máximo 5MB." });
        }
        const mimeMatch = input.imageBase64.match(/^data:(image\/\w+);base64,/);
        const contentType = mimeMatch ? mimeMatch[1] : "image/jpeg";
        const { url } = await storagePut(`client_photo_${input.clientId}`, buffer, contentType, "client_photos");
        await db.updateClient(input.clientId, { profilePhoto: url } as any);
        return { success: true, photoUrl: url };
      }),

    updateProfile: publicProcedure
      .input(z.object({
        clientId: z.number(),
        name: z.string().min(1).optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        syndicName: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { clientId, ...updateData } = input;
        await db.updateClient(clientId, updateData);
        return { success: true, message: "Perfil atualizado com sucesso" };
      }),

    changePassword: publicProcedure
      .input(z.object({
        clientId: z.number(),
        currentPassword: z.string(),
        newPassword: z.string().min(6),
      }))
      .mutation(async ({ input }) => {
        const client = await db.getClientById(input.clientId);
        if (!client) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Cliente nao encontrado" });
        }

        const isPasswordValid = await comparePassword(input.currentPassword, client.password);
        if (!isPasswordValid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Senha atual invalida" });
        }

        const hashedPassword = await hashPassword(input.newPassword);
        await db.updateClientPassword(input.clientId, hashedPassword);
        return { success: true, message: "Senha alterada com sucesso" };
      }),
  }),

  adminProfile: router({
    getProfile: publicProcedure
      .input(z.object({ adminId: z.number() }))
      .query(async ({ input }) => {
        const admin = await db.getAdminById(input.adminId);
        if (!admin) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Admin nao encontrado" });
        }
        return {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          phone: admin.phone,
          profilePhoto: admin.profilePhoto,
        };
      }),

    updateProfile: publicProcedure
      .input(z.object({
        adminId: z.number(),
        name: z.string().min(1).optional(),
        phone: z.string().optional(),
        profilePhoto: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { adminId, ...updateData } = input;
        await db.updateAdminProfile(adminId, updateData);
        return { success: true, message: "Perfil atualizado com sucesso" };
      }),

    adminDocuments: router({
      list: publicProcedure
        .input(z.object({ adminId: z.number() }))
        .query(async ({ input }) => {
          return await db.getDocumentsByAdminId(input.adminId);
        }),

      update: publicProcedure
        .input(z.object({
          id: z.number(),
          title: z.string().min(1),
          description: z.string().optional(),
          documentType: z.enum(["vistoria", "visita", "nota_fiscal", "servico", "relatorio_servico", "relatorio_visita"]),
        }))
        .mutation(async ({ input }) => {
          const { id, title, description, documentType } = input;
          await db.updateDocument(id, title, description || "", documentType);
          return { success: true, message: "Documento atualizado com sucesso" };
        }),

      delete: publicProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          await db.deleteDocument(input.id);
          return { success: true, message: "Documento deletado com sucesso" };
        }),

      updateFile: publicProcedure
        .input(z.object({
          id: z.number(),
          fileUrl: z.string().url(),
        }))
        .mutation(async ({ input }) => {
          await db.updateDocumentFile(input.id, input.fileUrl);
          return { success: true, message: "Arquivo atualizado com sucesso" };
        }),
    }),
  }),

  adminDocuments: router({
    list: publicProcedure
      .input(z.object({ adminId: z.number() }))
      .query(async ({ input }) => {
        return await db.getDocumentsByAdminId(input.adminId);
      }),

    update: publicProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1),
        description: z.string().optional(),
        documentType: z.enum(["vistoria", "visita", "nota_fiscal", "servico", "relatorio_servico", "relatorio_visita"]),
      }))
      .mutation(async ({ input }) => {
        const { id, title, description, documentType } = input;
        await db.updateDocument(id, title, description || "", documentType);
        return { success: true, message: "Documento atualizado com sucesso" };
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteDocument(input.id);
        return { success: true, message: "Documento deletado com sucesso" };
      }),
  }),

  workOrders: router({
    // Listar OS com filtros, busca e paginação
    list: publicProcedure
      .input(z.object({
        clientId: z.number().optional(),
        adminId: z.number().optional(),
        type: z.enum(["rotina", "emergencial", "orcamento"]).optional(),
        status: z.string().optional(),
        priority: z.string().optional(),
        search: z.string().optional(),
        page: z.number().default(1),
        limit: z.number().default(10),
        sortBy: z.string().default("createdAt"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
      }))
      .query(async ({ input }) => {
        const workOrdersDb = await import("./workOrdersDb");
        // A função listWorkOrders no seu db.ts agora deve receber esses campos
        return await workOrdersDb.listWorkOrders(input);
      }),
    
    // Buscar OS por ID
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const workOrdersDb = await import("./workOrdersDb");
        return await workOrdersDb.getWorkOrderById(input.id);
      }),

   // Criar nova OS
    create: publicProcedure
      .input(z.object({
        adminId: z.number(),
        clientId: z.number(),
        type: z.enum(["rotina", "emergencial", "orcamento"]),
        priority: z.enum(["normal", "alta", "critica"]).default("normal"),
        title: z.string().min(1),
        description: z.string().optional(),
        // ... outros campos
      }))
      .mutation(async ({ input }) => {
        const workOrdersDb = await import("./workOrdersDb");
        const convertedInput = {
          ...input,
          scheduledDate: input.scheduledDate ? new Date(input.scheduledDate) : undefined,
        };

        // 1. Cria a OS no banco
const result = await workOrdersDb.createWorkOrder(convertedInput as any);

// Tenta capturar o ID de todas as formas possíveis que o banco costuma retornar
const osId = result?.insertId || result?.id || (Array.isArray(result) ? result[0] : result);

// Log para conferência na VPS (pm2 logs)
console.log(`--- DEBUG JNC: OS criada com ID ${osId} ---`);

//  Busca o nome do cliente para a mensagem (melhora o aviso)
const cliente = await db.getClientById(input.clientId);
const nomeCliente = cliente?.name || `ID ${input.clientId}`;

//  Monta a URL (agora com o ID capturado corretamente)
const portalUrl = `https://jnc.soluteg.com.br/admin/work-orders/${osId}`;

        //  Configura os links corretos da JNC / Soluteg

const msg = `🚨 *NOVA OS - PORTAL JNC SOLUTEG* 🚨\n\n` +
            `🛠️ *Serviço:* ${input.title}\n` +
            `🏢 *Condomínio:* ${nomeCliente}\n` +
            `📅 *Tipo:* ${input.type.toUpperCase()}\n` +
            `⚡ *Prioridade:* ${input.priority.toUpperCase()}\n\n` +
            `🔗 *Acesse os detalhes aqui:* \n${portalUrl}`; // Adicionei uma quebra de linha para facilitar o clique

        // 4. Envia o alerta (Zap)
        sendWhatsappAlert(msg).catch(e => console.error("Erro no Zap JNC:", e));

        return { 
            success: true, 
            message: "OS criada com sucesso", 
            id: osId 
        };
    }),
      

    // Atualizar OS
    update: publicProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        serviceType: z.string().optional(),
        status: z.enum([
          "aberta",
          "aguardando_aprovacao",
          "aprovada",
          "rejeitada",
          "em_andamento",
          "concluida",
          "aguardando_pagamento",
          "cancelada"
        ]).optional(),
        priority: z.enum(["normal", "alta", "critica"]).optional(),
        scheduledDate: z.string().optional(),
        startedAt: z.date().optional(),
        completedAt: z.date().optional(),
        estimatedHours: z.number().optional(),
        actualHours: z.number().optional(),
        estimatedValue: z.number().optional(),
        finalValue: z.number().optional(),
        internalNotes: z.string().optional(),
        clientNotes: z.string().optional(),
        cancellationReason: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const workOrdersDb = await import("./workOrdersDb");
        const { id, ...data } = input;
        const convertedData = {
          ...data,
          scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : undefined,
        };
        await workOrdersDb.updateWorkOrder(id, convertedData as any);
        return { success: true, message: "OS atualizada com sucesso" };
      }),

    // Atualizar status com histórico
    updateStatus: publicProcedure
      .input(z.object({
        id: z.number(),
        newStatus: z.string(),
        changedBy: z.string(),
        changedByType: z.enum(["admin", "client"]),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const workOrdersDb = await import("./workOrdersDb");
        await workOrdersDb.updateWorkOrderStatus(
          input.id,
          input.newStatus,
          input.changedBy,
          input.changedByType,
          input.notes
        );
        return { success: true, message: "Status atualizado com sucesso" };
      }),

    // Buscar histórico de uma OS
    getHistory: publicProcedure
      .input(z.object({ workOrderId: z.number() }))
      .query(async ({ input }) => {
        const workOrdersDb = await import("./workOrdersDb");
        return await workOrdersDb.getWorkOrderHistory(input.workOrderId);
      }),

    // Deletar OS
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const workOrdersDb = await import("./workOrdersDb");
        await workOrdersDb.deleteWorkOrder(input.id);
        return { success: true, message: "OS deletada com sucesso" };
      }),

    // Deletar multiplas OS
    deleteBatch: publicProcedure
      .input(z.object({ ids: z.array(z.number()).min(1) }))
      .mutation(async ({ input }) => {
        const workOrdersDb = await import("./workOrdersDb");
        await workOrdersDb.deleteMultipleWorkOrders(input.ids);
        return { success: true, message: `${input.ids.length} OS deletadas com sucesso` };
      }),

    // Concluir OS com assinaturas
    complete: publicProcedure
      .input(z.object({
        id: z.number(),
        collaboratorName: z.string().min(1),
        collaboratorSignature: z.string().min(1),
        clientName: z.string().optional(),
        clientSignature: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const workOrdersDb = await import("./workOrdersDb");
        const { id, collaboratorName, collaboratorSignature, clientName, clientSignature } = input;
        
        console.log("[workOrders.complete] Recebido:", {
          id,
          collaboratorName,
          collaboratorSignatureSize: collaboratorSignature?.length,
          clientName,
          clientSignatureSize: clientSignature?.length,
        });
        
        const updateData: Partial<any> = {
          status: "concluida" as const,
          completedAt: new Date(),
          collaboratorName,
          collaboratorSignature,
          clientName: clientName || undefined,
          clientSignature: clientSignature || undefined,
          signedAt: new Date(),
        };
        
        await workOrdersDb.updateWorkOrder(id, updateData as any);
        
        console.log("[workOrders.complete] OS atualizada com sucesso");
        return { success: true, message: "OS concluida com sucesso" };
      }),

    // Cancelar recorrencia
    cancelRecurrence: publicProcedure
      .input(z.object({
        id: z.number(),
        cancelFuture: z.boolean(),
      }))
      .mutation(async ({ input }) => {
        const workOrdersDb = await import("./workOrdersDb");
        if (input.cancelFuture) {
          await workOrdersDb.updateWorkOrder(input.id, { recurrenceCanceled: 1 });
        }
        await workOrdersDb.updateWorkOrder(input.id, { status: "cancelada" as any });
        return { success: true, message: "Recorrência cancelada com sucesso" };
      }),

    // ==================== TASKS ====================
    tasks: router({
      list: publicProcedure
        .input(z.object({ workOrderId: z.number() }))
        .query(async ({ input }) => {
          const auxDb = await import("./workOrdersAuxDb");
          return await auxDb.getTasksByWorkOrderId(input.workOrderId);
        }),

      create: publicProcedure
        .input(z.object({
          workOrderId: z.number(),
          title: z.string().min(1),
          description: z.string().optional(),
          orderIndex: z.number().default(0),
        }))
        .mutation(async ({ input }) => {
          const auxDb = await import("./workOrdersAuxDb");
          await auxDb.createTask(input);
          return { success: true, message: "Tarefa criada com sucesso" };
        }),

      update: publicProcedure
        .input(z.object({
          id: z.number(),
          title: z.string().optional(),
          description: z.string().optional(),
          orderIndex: z.number().optional(),
        }))
        .mutation(async ({ input }) => {
          const auxDb = await import("./workOrdersAuxDb");
          const { id, ...updates } = input;
          await auxDb.updateTask(id, updates);
          return { success: true, message: "Tarefa atualizada com sucesso" };
        }),

      toggle: publicProcedure
        .input(z.object({
          id: z.number(),
          isCompleted: z.boolean(),
          completedBy: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
          const auxDb = await import("./workOrdersAuxDb");
          await auxDb.toggleTaskCompletion(input.id, input.isCompleted, input.completedBy);
          return { success: true, message: "Tarefa atualizada com sucesso" };
        }),

      setStatus: publicProcedure
        .input(z.object({
          id: z.number(),
          status: z.number().min(0).max(2),
          completedBy: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
          const auxDb = await import("./workOrdersAuxDb");
          await auxDb.setTaskStatus(input.id, input.status, input.completedBy);
          return { success: true };
        }),

      delete: publicProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          const auxDb = await import("./workOrdersAuxDb");
          await auxDb.deleteTask(input.id);
          return { success: true, message: "Tarefa deletada com sucesso" };
        }),
    }),

    // ==================== MATERIALS ====================
    materials: router({
      list: publicProcedure
        .input(z.object({ workOrderId: z.number() }))
        .query(async ({ input }) => {
          const auxDb = await import("./workOrdersAuxDb");
          return await auxDb.getMaterialsByWorkOrderId(input.workOrderId);
        }),

      create: publicProcedure
        .input(z.object({
          workOrderId: z.number(),
          materialName: z.string().min(1),
          quantity: z.number().min(1),
          unit: z.string().optional(),
          unitCost: z.number().optional(),
          totalCost: z.number().optional(),
          addedBy: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
          const auxDb = await import("./workOrdersAuxDb");
          await auxDb.createMaterial(input);
          return { success: true, message: "Material adicionado com sucesso" };
        }),

      update: publicProcedure
        .input(z.object({
          id: z.number(),
          materialName: z.string().optional(),
          quantity: z.number().optional(),
          unit: z.string().optional(),
          unitCost: z.number().optional(),
          totalCost: z.number().optional(),
        }))
        .mutation(async ({ input }) => {
          const auxDb = await import("./workOrdersAuxDb");
          const { id, ...updates } = input;
          await auxDb.updateMaterial(id, updates);
          return { success: true, message: "Material atualizado com sucesso" };
        }),

      delete: publicProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          const auxDb = await import("./workOrdersAuxDb");
          await auxDb.deleteMaterial(input.id);
          return { success: true, message: "Material deletado com sucesso" };
        }),

      getTotalCost: publicProcedure
        .input(z.object({ workOrderId: z.number() }))
        .query(async ({ input }) => {
          const auxDb = await import("./workOrdersAuxDb");
          return await auxDb.getTotalMaterialsCost(input.workOrderId);
        }),
    }),

    // ==================== ATTACHMENTS ====================
   // ==================== ATTACHMENTS ====================
attachments: router({
  list: publicProcedure
    .input(z.object({
      workOrderId: z.number(),
      category: z.enum(["before", "during", "after", "document", "other"]).optional(),
    }))
    .query(async ({ input }) => {
      const auxDb = await import("./workOrdersAuxDb");
      if (input.category) {
        return await auxDb.getAttachmentsByCategory(input.workOrderId, input.category);
      }
      return await auxDb.getAttachmentsByWorkOrderId(input.workOrderId);
    }),

  create: publicProcedure
    .input(z.object({
      workOrderId: z.number(),
      fileName: z.string().min(1),
      fileKey: z.string().min(1),
      fileUrl: z.string().min(1),
      fileType: z.string().optional(),
      fileSize: z.number().optional(),
      category: z.enum(["before", "during", "after", "document", "other"]).default("other"),
      uploadedBy: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const auxDb = await import("./workOrdersAuxDb");
      await auxDb.createAttachment(input);
      return { success: true, message: "Anexo adicionado com sucesso" };
    }),

  update: publicProcedure
    .input(z.object({
      id: z.number(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const auxDb = await import("./workOrdersAuxDb");
      const { id, description } = input;
      await auxDb.updateAttachment(id, { description });
      return { success: true, message: "Legenda atualizada com sucesso" };
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const auxDb = await import("./workOrdersAuxDb");
      await auxDb.deleteAttachment(input.id);
      return { success: true, message: "Anexo deletado com sucesso" };
    }),
}),

    // ==================== COMMENTS ====================
    comments: router({
      list: publicProcedure
        .input(z.object({
          workOrderId: z.number(),
          includeInternal: z.boolean().default(true),
        }))
        .query(async ({ input }) => {
          const auxDb = await import("./workOrdersAuxDb");
          return await auxDb.getCommentsByWorkOrderId(input.workOrderId, input.includeInternal);
        }),

      create: publicProcedure
        .input(z.object({
          workOrderId: z.number(),
          userId: z.string().min(1),
          userType: z.enum(["admin", "client"]),
          comment: z.string().min(1),
          isInternal: z.number().default(1),
        }))
        .mutation(async ({ input }) => {
          const auxDb = await import("./workOrdersAuxDb");
          await auxDb.createComment(input);
          return { success: true, message: "Comentário adicionado com sucesso" };
        }),

      delete: publicProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          const auxDb = await import("./workOrdersAuxDb");
          await auxDb.deleteComment(input.id);
          return { success: true, message: "Comentário deletado com sucesso" };
        }),
    }),

    // ==================== RECURRENCE ====================
    recurrence: router({
      process: publicProcedure.mutation(async () => {
        const recurrence = await import("./workOrdersRecurrence");
        return await recurrence.processRecurringWorkOrders();
      }),

      cancel: publicProcedure
        .input(z.object({
          workOrderId: z.number(),
          cancelFutureOnly: z.boolean().optional().default(false),
        }))
        .mutation(async ({ input }) => {
          const recurrence = await import("./workOrdersRecurrence");
          return await recurrence.cancelRecurrence(input.workOrderId, input.cancelFutureOnly);
        }),

      reactivate: publicProcedure
        .input(z.object({ workOrderId: z.number() }))
        .mutation(async ({ input }) => {
          const recurrence = await import("./workOrdersRecurrence");
          return await recurrence.reactivateRecurrence(input.workOrderId);
        }),

      getNextDate: publicProcedure
        .input(z.object({ workOrderId: z.number() }))
        .query(async ({ input }) => {
          const recurrence = await import("./workOrdersRecurrence");
          return await recurrence.getNextRecurrenceDate(input.workOrderId);
        }),

      getInstances: publicProcedure
        .input(z.object({ parentWorkOrderId: z.number() }))
        .query(async ({ input }) => {
          const recurrence = await import("./workOrdersRecurrence");
          return await recurrence.getRecurrenceInstances(input.parentWorkOrderId);
        }),
    }),

    // ==================== METRICS ====================
    metrics: router({      getStats: publicProcedure.query(async () => {
        const metrics = await import("./workOrdersMetrics");
        return await metrics.getWorkOrderStats();
      }),

      getByStatus: publicProcedure.query(async () => {
        const metrics = await import("./workOrdersMetrics");
        return await metrics.getWorkOrdersByStatus();
      }),

      getByType: publicProcedure.query(async () => {
        const metrics = await import("./workOrdersMetrics");
        return await metrics.getWorkOrdersByType();
      }),

      getAverageCompletionTime: publicProcedure.query(async () => {
        const metrics = await import("./workOrdersMetrics");
        return await metrics.getAverageCompletionTime();
      }),

      getFinancialStats: publicProcedure.query(async () => {
        const metrics = await import("./workOrdersMetrics");
        return await metrics.getFinancialStats();
      }),

      getByMonth: publicProcedure.query(async () => {
        const metrics = await import("./workOrdersMetrics");
        return await metrics.getWorkOrdersByMonth();
      }),

      getCompletionRate: publicProcedure.query(async () => {
        const metrics = await import("./workOrdersMetrics");
        return await metrics.getCompletionRate();
      }),

      getDelayed: publicProcedure.query(async () => {
        const metrics = await import("./workOrdersMetrics");
        return await metrics.getDelayedWorkOrders();
      }),

      getTopClients: publicProcedure.query(async () => {
        const metrics = await import("./workOrdersMetrics");
        return await metrics.getTopClientsByWorkOrders();
      }),

      getMaterialsCostByWorkOrder: publicProcedure.query(async () => {
        const metrics = await import("./workOrdersMetrics");
        return await metrics.getMaterialsCostByWorkOrder();
      }),
    }),

    // ==================== PDF EXPORT ====================
    exportPDF: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const pdfGen = await import("./pdfGenerator");
        const pdfBuffer = await pdfGen.generateWorkOrderPDF(input.id);
        // Buscar dados da OS para montar o nome do arquivo
        const workOrdersDb = await import("./workOrdersDb");
        const wo = await workOrdersDb.getWorkOrderById(input.id);
        const osNum = wo?.osNumber || `OS-${input.id}`;
        const clientSlug = wo?.clientName
          ? wo.clientName.trim().replace(/[^\w\u00C0-\u00FF]/g, '_').replace(/_+/g, '_').substring(0, 40)
          : 'cliente';
        return {
          success: true,
          pdf: pdfBuffer.toString('base64'),
          filename: `${osNum}_${clientSlug}.pdf`
        };
      }),
    
    exportBatch: publicProcedure
      .input(z.object({ ids: z.array(z.number()) }))
      .mutation(async ({ input }) => {
        const JSZip = (await import('jszip')).default;
        const pdfGen = await import("./pdfGenerator");
        
        const zip = new JSZip();
        
        // Buscar workOrdersDb para nomes de arquivo
        const workOrdersDb = await import("./workOrdersDb");
        // Gerar PDF para cada OS
        for (const id of input.ids) {
          try {
            const pdfBuffer = await pdfGen.generateWorkOrderPDF(id);
            const wo = await workOrdersDb.getWorkOrderById(id);
            const osNum = wo?.osNumber || `OS-${id}`;
            const clientSlug = wo?.clientName
              ? wo.clientName.trim().replace(/[^\w\u00C0-\u00FF]/g, '_').replace(/_+/g, '_').substring(0, 40)
              : 'cliente';
            zip.file(`${osNum}_${clientSlug}.pdf`, pdfBuffer);
          } catch (error) {
            console.error(`Erro ao gerar PDF da OS ${id}:`, error);
          }
        }
        
        // Gerar ZIP
        const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
        const timestamp = new Date().toISOString().split('T')[0];
        
        return {
          success: true,
          zipBase64: zipBuffer.toString('base64'),
          filename: `ordens-servico-${timestamp}.zip`
        };
      }),

    // ==================== PORTAL / WHATSAPP SHARING ====================

    // Buscar OSs compartilhadas para o portal do cliente
    getSharedForPortal: publicProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }) => {
        const workOrdersDb = await import("./workOrdersDb");
        return await workOrdersDb.getSharedWorkOrdersForPortal(input.clientId);
      }),

    // Enviar link da OS para o WhatsApp do cliente
    sendToClientWhatsapp: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const workOrdersDb = await import("./workOrdersDb");
        const wo = await workOrdersDb.getWorkOrderById(input.id);
        if (!wo) throw new Error("OS não encontrada");

        const cliente = await db.getClientById(wo.clientId);
        if (!cliente?.phone) throw new Error("Cliente sem telefone cadastrado");

        const portalUrl = `https://jnc.soluteg.com.br/client/portal`;
        const msg =
          `📋 *OS ${wo.osNumber}* - ${wo.title}\n\n` +
          `🏢 Condomínio: ${wo.clientName || cliente.name}\n` +
          `📌 Status: ${wo.status}\n\n` +
          `🔗 *Acesse seu portal:*\n${portalUrl}`;

        const pdfGen = await import("./pdfGenerator");
        const pdfBuffer = await pdfGen.generateWorkOrderPDF(input.id);
        const filename = `OS-${wo.osNumber || input.id}.pdf`;

        const { sendWhatsappToNumberWithPDF } = await import("./whatsapp");
        await sendWhatsappToNumberWithPDF(cliente.phone, msg, pdfBuffer, filename);
        return { success: true };
      }),

    // Enviar link da OS para o WhatsApp do Admin (JNC)
    sendToAdminWhatsapp: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const workOrdersDb = await import("./workOrdersDb");
        const wo = await workOrdersDb.getWorkOrderById(input.id);
        if (!wo) throw new Error("OS não encontrada");

        const portalUrl = `https://jnc.soluteg.com.br/admin/work-orders/${input.id}`;
        const msg =
          `📋 *OS ${wo.osNumber}* - ${wo.title}\n\n` +
          `🏢 Cliente: ${wo.clientName}\n` +
          `📌 Tipo: ${wo.type?.toUpperCase()} | Status: ${wo.status}\n\n` +
          `🔗 *Ver no painel:*\n${portalUrl}`;

        const pdfGen = await import("./pdfGenerator");
        const pdfBuffer = await pdfGen.generateWorkOrderPDF(input.id);
        const filename = `OS-${wo.osNumber || input.id}.pdf`;

        const { sendWhatsappAlertWithPDF } = await import("./whatsapp");
        sendWhatsappAlertWithPDF(msg, pdfBuffer, filename).catch(e => console.error("Erro no Zap JNC:", e));
        return { success: true };
      }),

    // Compartilhar OS no portal do cliente + notificar via WhatsApp
    shareToClientPortal: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const workOrdersDb = await import("./workOrdersDb");
        const wo = await workOrdersDb.getWorkOrderById(input.id);
        if (!wo) throw new Error("OS não encontrada");

        // Determina a aba de destino conforme tipo/status
        let portalTab: string;
        if (wo.type === "rotina") {
          portalTab = "vistoria";
        } else if (wo.type === "emergencial") {
          portalTab = "visita";
        } else if (["instalacao", "manutencao", "corretiva", "preventiva"].includes(wo.type) && wo.status === "concluida") {
          portalTab = "servico";
        } else {
          portalTab = "visita"; // outros tipos em aberto/andamento
        }

        await workOrdersDb.shareWorkOrderToPortal(input.id, portalTab);

        // Notifica o cliente via WhatsApp com credenciais de acesso
        const cliente = await db.getClientById(wo.clientId);
        if (cliente?.phone) {
          const portalUrl = `https://jnc.soluteg.com.br/client/portal`;
          const tabLabel: Record<string, string> = {
            vistoria: "Vistoria",
            visita: "Visita",
            servico: "Serviços",
            orcamentos: "Orçamentos",
          };
          const msg =
            `📋 *JNC Soluteg – Portal do Cliente*\n\n` +
            `Olá, ${cliente.name}!\n\n` +
            `A OS *${wo.osNumber}* foi disponibilizada na aba *${tabLabel[portalTab] || portalTab}* do seu portal.\n\n` +
            `🔗 Acesse: ${portalUrl}\n` +
            `👤 Login: ${cliente.username}\n` +
            `🔑 Senha: (sua senha cadastrada)\n\n` +
            `Em caso de dúvidas, entre em contato conosco.`;

          const { sendWhatsappToNumber } = await import("./whatsapp");
          sendWhatsappToNumber(cliente.phone, msg).catch(e =>
            console.error("Erro ao notificar cliente via WhatsApp:", e)
          );
        }

        return { success: true, portalTab };
      }),

    // ==================== TIME TRACKING ====================
    timeTracking: router({
      list: publicProcedure
        .input(z.object({ workOrderId: z.number() }))
        .query(async ({ input }) => {
          const auxDb = await import("./workOrdersAuxDb");
          return await auxDb.getTimeEntriesByWorkOrderId(input.workOrderId);
        }),

      create: publicProcedure
        .input(z.object({
          workOrderId: z.number(),
          userId: z.string().min(1),
          startedAt: z.date(),
          notes: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
          const auxDb = await import("./workOrdersAuxDb");
          await auxDb.createTimeEntry(input);
          return { success: true, message: "Entrada de tempo criada com sucesso" };
        }),

      end: publicProcedure
        .input(z.object({
          id: z.number(),
          endedAt: z.date(),
        }))
        .mutation(async ({ input }) => {
          const auxDb = await import("./workOrdersAuxDb");
          await auxDb.endTimeEntry(input.id, input.endedAt);
          return { success: true, message: "Entrada de tempo finalizada com sucesso" };
        }),

      update: publicProcedure
        .input(z.object({
          id: z.number(),
          notes: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
          const auxDb = await import("./workOrdersAuxDb");
          const { id, ...updates } = input;
          await auxDb.updateTimeEntry(id, updates);
          return { success: true, message: "Entrada de tempo atualizada com sucesso" };
        }),

      delete: publicProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          const auxDb = await import("./workOrdersAuxDb");
          await auxDb.deleteTimeEntry(input.id);
          return { success: true, message: "Entrada de tempo deletada com sucesso" };
        }),

      getTotalTime: publicProcedure
        .input(z.object({ workOrderId: z.number() }))
        .query(async ({ input }) => {
          const auxDb = await import("./workOrdersAuxDb");
          return await auxDb.getTotalTimeSpent(input.workOrderId);
        }),
    }),
  }),

  // ==================== CHECKLISTS ====================
  checklists: router({
    // Templates
    templates: router({
      list: publicProcedure.query(async () => {
        const checklistDb = await import("./checklistsDb");
        return await checklistDb.getAllTemplates();
      }),

      getById: publicProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
          const checklistDb = await import("./checklistsDb");
          return await checklistDb.getTemplateById(input.id);
        }),

      getBySlug: publicProcedure
        .input(z.object({ slug: z.string() }))
        .query(async ({ input }) => {
          const checklistDb = await import("./checklistsDb");
          return await checklistDb.getTemplateBySlug(input.slug);
        }),
    }),

    // Inspection Tasks
    inspectionTasks: router({
      listByWorkOrder: publicProcedure
        .input(z.object({ workOrderId: z.number() }))
        .query(async ({ input }) => {
          const checklistDb = await import("./checklistsDb");
          return await checklistDb.getInspectionTasksByWorkOrder(input.workOrderId);
        }),

      getById: publicProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
          const checklistDb = await import("./checklistsDb");
          return await checklistDb.getInspectionTaskById(input.id);
        }),

      getFull: publicProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
          const checklistDb = await import("./checklistsDb");
          return await checklistDb.getFullInspectionTask(input.id);
        }),

      create: publicProcedure
        .input(z.object({
          workOrderId: z.number(),
          title: z.string().min(1),
          description: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
          const checklistDb = await import("./checklistsDb");
          const id = await checklistDb.createInspectionTask(input);
          return { success: true, id, message: "Tarefa de inspeção criada com sucesso" };
        }),

      updateStatus: publicProcedure
        .input(z.object({
          id: z.number(),
          status: z.enum(["pendente", "em_andamento", "concluida"]),
        }))
        .mutation(async ({ input }) => {
          const checklistDb = await import("./checklistsDb");
          await checklistDb.updateInspectionTaskStatus(input.id, input.status);
          return { success: true, message: "Status atualizado com sucesso" };
        }),

      complete: publicProcedure
        .input(z.object({
          id: z.number(),
          collaboratorSignature: z.string().min(1),
          collaboratorName: z.string().min(1),
          collaboratorDocument: z.string().min(1),
          clientSignature: z.string().optional(),
          clientName: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
          const checklistDb = await import("./checklistsDb");
          
          // Verificar se todos os checklists estão completos
          const allComplete = await checklistDb.areAllChecklistsComplete(input.id);
          if (!allComplete) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Todos os checklists devem estar preenchidos antes de concluir a tarefa",
            });
          }
          
          await checklistDb.completeInspectionTask(input.id, input);
          return { success: true, message: "Tarefa concluída com sucesso" };
        }),

      delete: publicProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          const checklistDb = await import("./checklistsDb");
          await checklistDb.deleteInspectionTask(input.id);
          return { success: true, message: "Tarefa deletada com sucesso" };
        }),

      canComplete: publicProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
          // Temporariamente sempre permitir concluir tarefa
          return true;
        }),
    }),

    // Checklist Instances
    instances: router({
      listByTask: publicProcedure
        .input(z.object({ inspectionTaskId: z.number() }))
        .query(async ({ input }) => {
          const checklistDb = await import("./checklistsDb");
          return await checklistDb.getChecklistsByInspectionTask(input.inspectionTaskId);
        }),

      listByWorkOrder: publicProcedure
        .input(z.object({ workOrderId: z.number() }))
        .query(async ({ input }) => {
          const checklistDb = await import("./checklistsDb");
          return await checklistDb.getChecklistsByWorkOrderId(input.workOrderId);
        }),

      getById: publicProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
          const checklistDb = await import("./checklistsDb");
          return await checklistDb.getChecklistInstanceById(input.id);
        }),

      getWithTemplate: publicProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
          const checklistDb = await import("./checklistsDb");
          return await checklistDb.getChecklistWithTemplate(input.id);
        }),

      create: publicProcedure
        .input(z.object({
          inspectionTaskId: z.number(),
          templateId: z.number(),
          customTitle: z.string().min(1),
          brand: z.string().optional(),
          power: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
          const checklistDb = await import("./checklistsDb");
          const id = await checklistDb.createChecklistInstance(input);
          return { success: true, id, message: "Checklist adicionado com sucesso" };
        }),

      updateResponses: publicProcedure
        .input(z.object({
          id: z.number(),
          responses: z.record(z.string(), z.unknown()),
          isComplete: z.boolean(),
        }))
        .mutation(async ({ input }) => {
          const checklistDb = await import("./checklistsDb");
          await checklistDb.updateChecklistResponses(input.id, input.responses, input.isComplete);
          return { success: true, message: "Respostas salvas com sucesso" };
        }),

      update: publicProcedure
        .input(z.object({
          id: z.number(),
          customTitle: z.string().optional(),
          brand: z.string().optional(),
          power: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
          const checklistDb = await import("./checklistsDb");
          const { id, ...data } = input;
          await checklistDb.updateChecklistInstance(id, data);
          return { success: true, message: "Checklist atualizado com sucesso" };
        }),

      delete: publicProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          const checklistDb = await import("./checklistsDb");
          await checklistDb.deleteChecklistInstance(input.id);
          return { success: true, message: "Checklist deletado com sucesso" };
        }),
    }),
  }),

  // ==================== BUDGETS (ORÇAMENTOS) ====================
  budgets: router({

    // Listar orçamentos
    list: publicProcedure
      .input(z.object({
        adminId: z.number().optional(),
        clientId: z.number().optional(),
        status: z.enum(["pendente", "finalizado", "aprovado", "reprovado"]).optional(),
        search: z.string().optional(),
        page: z.number().default(1),
        limit: z.number().default(10),
        sortBy: z.string().default("createdAt"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
      }))
      .query(async ({ input }) => {
        const budgetsDb = await import("./budgetsDb");
        return await budgetsDb.listBudgets(input);
      }),

    // Buscar por ID
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const budgetsDb = await import("./budgetsDb");
        return await budgetsDb.getBudgetById(input.id);
      }),

    // Buscar por token público (para página de aprovação)
    getByToken: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const budgetsDb = await import("./budgetsDb");
        return await budgetsDb.getBudgetByToken(input.token);
      }),

    // Criar orçamento
    create: publicProcedure
      .input(z.object({
        adminId: z.number(),
        clientId: z.number(),
        serviceType: z.enum(["instalacao", "manutencao", "corretiva", "preventiva", "rotina", "emergencial"]),
        priority: z.enum(["normal", "alta", "critica"]).default("normal"),
        title: z.string().min(1),
        description: z.string().optional(),
        scope: z.string().optional(),
        validityDays: z.number().default(30),
        laborValue: z.number().optional(),
        internalNotes: z.string().optional(),
        clientNotes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const budgetsDb = await import("./budgetsDb");
        const result = await budgetsDb.createBudget(input as any);

        // Notifica admin via WhatsApp
        const cliente = await db.getClientById(input.clientId);
        const nomeCliente = cliente?.name || `ID ${input.clientId}`;
        const adminUrl = `https://jnc.soluteg.com.br/admin/orcamentos/${result.id}`;
        const msg =
          `📝 *NOVO ORÇAMENTO - JNC SOLUTEG*\n\n` +
          `🏢 *Cliente:* ${nomeCliente}\n` +
          `🔧 *Serviço:* ${input.title}\n` +
          `📋 *Número:* ${result.budgetNumber}\n\n` +
          `🔗 *Acessar:* ${adminUrl}`;
        sendWhatsappAlert(msg).catch(e => console.error("Erro Zap orçamento:", e));

        return { success: true, ...result };
      }),

    // Atualizar orçamento (com histórico se estava finalizado)
    update: publicProcedure
      .input(z.object({
        id: z.number(),
        serviceType: z.enum(["instalacao", "manutencao", "corretiva", "preventiva", "rotina", "emergencial"]).optional(),
        priority: z.enum(["normal", "alta", "critica"]).optional(),
        title: z.string().optional(),
        description: z.string().optional(),
        scope: z.string().optional(),
        validityDays: z.number().optional(),
        laborValue: z.number().optional(),
        totalValue: z.number().optional(),
        internalNotes: z.string().optional(),
        clientNotes: z.string().optional(),
        changedBy: z.string(),
        saveSnapshot: z.boolean().default(false),
      }))
      .mutation(async ({ input }) => {
        const budgetsDb = await import("./budgetsDb");
        const { id, changedBy, saveSnapshot, ...data } = input;
        await budgetsDb.updateBudget(id, data as any, changedBy, saveSnapshot);
        return { success: true, message: "Orçamento atualizado com sucesso" };
      }),

    // Salvar itens do orçamento
    saveItems: publicProcedure
      .input(z.object({
        budgetId: z.number(),
        items: z.array(z.object({
          description: z.string().min(1),
          quantity: z.number(),       // em centésimos (100 = 1,00)
          unit: z.string(),
          unitPrice: z.number(),      // em centavos
          totalPrice: z.number(),     // em centavos
          orderIndex: z.number(),
        })),
      }))
      .mutation(async ({ input }) => {
        const budgetsDb = await import("./budgetsDb");
        await budgetsDb.upsertBudgetItems(input.budgetId, input.items);
        // Recalcula totalValue (itens + mão de obra)
        const itemsTotal = await budgetsDb.getTotalItemsValue(input.budgetId);
        const budget = await budgetsDb.getBudgetById(input.budgetId);
        const labor = budget?.laborValue ?? 0;
        await budgetsDb.updateBudget(input.budgetId, { totalValue: itemsTotal + labor }, "system");
        return { success: true, message: "Itens salvos com sucesso" };
      }),

    // Buscar itens
    getItems: publicProcedure
      .input(z.object({ budgetId: z.number() }))
      .query(async ({ input }) => {
        const budgetsDb = await import("./budgetsDb");
        return await budgetsDb.getBudgetItems(input.budgetId);
      }),

    // Finalizar orçamento (assinatura do técnico)
    finalize: publicProcedure
      .input(z.object({
        id: z.number(),
        technicianName: z.string().min(1),
        technicianSignature: z.string().min(1),
        technicianDocument: z.string().optional(),
        validityDays: z.number().default(30),
        adminId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const budgetsDb = await import("./budgetsDb");
        const { id, technicianName, technicianSignature, technicianDocument, validityDays, adminId } = input;
        const result = await budgetsDb.finalizeBudget(id, technicianName, technicianSignature, technicianDocument, validityDays, String(adminId));

        // Notifica cliente via WhatsApp com link de aprovação
        const budget = await budgetsDb.getBudgetById(id);
        if (budget) {
          const cliente = await db.getClientById(budget.clientId);
          if (cliente?.phone) {
            const approvalUrl = `https://jnc.soluteg.com.br/orcamento/${result.token}`;
            const msg =
              `📋 *JNC Soluteg – Orçamento Disponível*\n\n` +
              `Olá, ${cliente.name}!\n\n` +
              `Seu orçamento *${budget.budgetNumber}* está pronto para análise.\n` +
              `🔧 Serviço: ${budget.title}\n` +
              `💰 Valor total: R$ ${((budget.totalValue ?? 0) / 100).toFixed(2).replace('.', ',')}\n` +
              `📅 Válido até: ${result.validUntil.toLocaleDateString('pt-BR')}\n\n` +
              `👉 *Acesse para aprovar ou reprovar:*\n${approvalUrl}`;
            const { sendWhatsappToNumber } = await import("./whatsapp");
            sendWhatsappToNumber(cliente.phone, msg).catch(e => console.error("Erro Zap aprovação:", e));
          }
        }

        return { success: true, token: result.token, validUntil: result.validUntil };
      }),

    // Aprovar orçamento (admin ou via link público)
    approve: publicProcedure
      .input(z.object({
        id: z.number(),
        clientSignature: z.string().min(1),
        clientSignatureName: z.string().min(1),
        approvedBy: z.string(),
        changedByType: z.enum(["admin", "client"]),
        createOs: z.boolean().default(true),
      }))
      .mutation(async ({ input }) => {
        const budgetsDb = await import("./budgetsDb");
        await budgetsDb.approveBudget(input.id, input.clientSignature, input.clientSignatureName, input.approvedBy, input.changedByType);

        // Se solicitado, cria OS de serviço automaticamente
        let osId: number | null = null;
        if (input.createOs) {
          const budget = await budgetsDb.getBudgetById(input.id);
          if (budget) {
            const workOrdersDb = await import("./workOrdersDb");
            const osResult = await workOrdersDb.createWorkOrder({
              adminId: budget.adminId,
              clientId: budget.clientId,
              type: budget.serviceType as any,
              priority: budget.priority as any,
              title: budget.title,
              description: `${budget.description ?? ''}\n\n[Gerado a partir do Orçamento ${budget.budgetNumber}]`.trim(),
              status: "aberta",
              estimatedValue: budget.totalValue ?? undefined,
              internalNotes: `Orçamento de origem: ${budget.budgetNumber}`,
            } as any);
            osId = osResult.id;
            await budgetsDb.linkGeneratedOs(input.id, osId);

            // Notifica admin
            const adminUrl = `https://jnc.soluteg.com.br/admin/work-orders/${osId}`;
            const msg =
              `✅ *ORÇAMENTO APROVADO – OS GERADA*\n\n` +
              `📋 Orçamento: ${budget.budgetNumber}\n` +
              `🏢 Cliente: ${budget.clientName ?? ''}\n` +
              `🔗 OS Gerada: ${adminUrl}`;
            sendWhatsappAlert(msg).catch(e => console.error("Erro Zap OS gerada:", e));
          }
        }

        return { success: true, osId };
      }),

    // Reprovar orçamento
    reject: publicProcedure
      .input(z.object({
        id: z.number(),
        rejectionReason: z.string().min(1),
        rejectedBy: z.string(),
        changedByType: z.enum(["admin", "client"]),
      }))
      .mutation(async ({ input }) => {
        const budgetsDb = await import("./budgetsDb");
        await budgetsDb.rejectBudget(input.id, input.rejectionReason, input.rejectedBy, input.changedByType);
        return { success: true, message: "Orçamento reprovado" };
      }),

    // Buscar histórico
    getHistory: publicProcedure
      .input(z.object({ budgetId: z.number() }))
      .query(async ({ input }) => {
        const budgetsDb = await import("./budgetsDb");
        return await budgetsDb.getBudgetHistory(input.budgetId);
      }),

    // Métricas para o dashboard
    getMetrics: publicProcedure
      .input(z.object({ adminId: z.number() }))
      .query(async ({ input }) => {
        const budgetsDb = await import("./budgetsDb");
        return await budgetsDb.getBudgetMetrics(input.adminId);
      }),

    // Deletar orçamento
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const budgetsDb = await import("./budgetsDb");
        await budgetsDb.deleteBudget(input.id);
        return { success: true, message: "Orçamento deletado com sucesso" };
      }),

    // Exportar PDF do orçamento
    exportPDF: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const pdfGen = await import("./pdfGenerator");
        const pdfBuffer = await pdfGen.generateBudgetPDF(input.id);
        const budgetsDb = await import("./budgetsDb");
        const budget = await budgetsDb.getBudgetById(input.id);
        const num = budget?.budgetNumber || `ORC-${input.id}`;
        const clientSlug = budget?.clientName
          ? budget.clientName.trim().replace(/[^\w\u00C0-\u00FF]/g, '_').replace(/_+/g, '_').substring(0, 40)
          : 'cliente';
        return {
          success: true,
          pdf: pdfBuffer.toString('base64'),
          filename: `${num}_${clientSlug}.pdf`,
        };
      }),

    // Compartilhar orçamento no portal do cliente
    shareToPortal: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const budgetsDb = await import("./budgetsDb");
        await budgetsDb.updateBudget(input.id, { sharedWithPortal: 1 }, "admin");
        return { success: true };
      }),

    // Buscar orçamentos para o portal do cliente
    getForPortal: publicProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }) => {
        const budgetsDb = await import("./budgetsDb");
        return await budgetsDb.listBudgets({
          clientId: input.clientId,
          sortBy: "createdAt",
          sortOrder: "desc",
          limit: 50,
        });
      }),
  }),
});

export type AppRouter = typeof appRouter;
