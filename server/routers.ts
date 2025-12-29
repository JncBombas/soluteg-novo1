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
        email: z.string().email(),
        password: z.string().min(6),
      }))
      .mutation(async ({ input, ctx }) => {
        try {
          const result = await authenticateAdmin(input.email, input.password);
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
      .input(z.object({ adminId: z.number() }))
      .query(async ({ input }) => {
        return await db.getClientsByAdminId(input.adminId);
      }),

    create: publicProcedure
      .input(z.object({
        adminId: z.number(),
        name: z.string().min(1),
        email: z.string().email(),
        username: z.string().min(3).max(100),
        password: z.string().min(6),
        cnpjCpf: z.string().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { password, ...clientData } = input;
        const hashedPassword = await hashPassword(password);
        
        const result = await db.createClient({
          ...clientData,
          password: hashedPassword,
          active: 1,
        });
        
        return { success: true, message: "Cliente criado com sucesso" };
      }),

    update: publicProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        cnpjCpf: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updateData } = input;
        await db.updateClient(id, updateData);
        return { success: true, message: "Cliente atualizado com sucesso" };
      }),

    updatePassword: publicProcedure
      .input(z.object({
        id: z.number(),
        newPassword: z.string().min(6),
      }))
      .mutation(async ({ input }) => {
        const hashedPassword = await hashPassword(input.newPassword);
        await db.updateClientPassword(input.id, hashedPassword);
        return { success: true, message: "Senha atualizada com sucesso" };
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteClient(input.id);
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
        };
      }),

    updateProfile: publicProcedure
      .input(z.object({
        clientId: z.number(),
        name: z.string().min(1).optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
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
    // Listar OS com filtros
    list: publicProcedure
      .input(z.object({
        clientId: z.number().optional(),
        adminId: z.number().optional(),
        type: z.enum(["rotina", "emergencial", "orcamento"]).optional(),
        status: z.string().optional(),
      }))
      .query(async ({ input }) => {
        const workOrdersDb = await import("./workOrdersDb");
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
        serviceType: z.string().optional(),
        scheduledDate: z.date().optional(),
        estimatedHours: z.number().optional(),
        estimatedValue: z.number().optional(),
        isRecurring: z.number().default(0),
        recurrenceType: z.enum(["mensal_fixo", "mensal_inicio"]).optional(),
        recurrenceDay: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const workOrdersDb = await import("./workOrdersDb");
        const result = await workOrdersDb.createWorkOrder(input);
        return { success: true, message: "OS criada com sucesso", ...result };
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
        scheduledDate: z.date().optional(),
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
        await workOrdersDb.updateWorkOrder(id, data);
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

    // Cancelar recorrência
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
});

export type AppRouter = typeof appRouter;
