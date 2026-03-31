import * as db from "../db";
import { sendWhatsappAlert } from "../whatsapp";
import { publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const budgetsRouter = router({
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
      const budgetsDb = await import("../budgetsDb");
      return await budgetsDb.listBudgets(input);
    }),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const budgetsDb = await import("../budgetsDb");
      return await budgetsDb.getBudgetById(input.id);
    }),

  getByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const budgetsDb = await import("../budgetsDb");
      return await budgetsDb.getBudgetByToken(input.token);
    }),

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
      const budgetsDb = await import("../budgetsDb");
      const result = await budgetsDb.createBudget(input as any);

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
      const budgetsDb = await import("../budgetsDb");
      const { id, changedBy, saveSnapshot, ...data } = input;
      await budgetsDb.updateBudget(id, data as any, changedBy, saveSnapshot);
      return { success: true, message: "Orçamento atualizado com sucesso" };
    }),

  saveItems: publicProcedure
    .input(z.object({
      budgetId: z.number(),
      items: z.array(z.object({
        description: z.string().min(1),
        quantity: z.number(),
        unit: z.string(),
        unitPrice: z.number(),
        totalPrice: z.number(),
        orderIndex: z.number(),
      })),
    }))
    .mutation(async ({ input }) => {
      const budgetsDb = await import("../budgetsDb");
      await budgetsDb.upsertBudgetItems(input.budgetId, input.items);
      const itemsTotal = await budgetsDb.getTotalItemsValue(input.budgetId);
      const budget = await budgetsDb.getBudgetById(input.budgetId);
      const labor = budget?.laborValue ?? 0;
      await budgetsDb.updateBudget(input.budgetId, { totalValue: itemsTotal + labor }, "system");
      return { success: true, message: "Itens salvos com sucesso" };
    }),

  getItems: publicProcedure
    .input(z.object({ budgetId: z.number() }))
    .query(async ({ input }) => {
      const budgetsDb = await import("../budgetsDb");
      return await budgetsDb.getBudgetItems(input.budgetId);
    }),

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
      const budgetsDb = await import("../budgetsDb");
      const { id, technicianName, technicianSignature, technicianDocument, validityDays, adminId } = input;
      const result = await budgetsDb.finalizeBudget(id, technicianName, technicianSignature, technicianDocument, validityDays, String(adminId));

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
          const { sendWhatsappToNumber } = await import("../whatsapp");
          sendWhatsappToNumber(cliente.phone, msg).catch(e => console.error("Erro Zap aprovação:", e));
        }
      }

      return { success: true, token: result.token, validUntil: result.validUntil };
    }),

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
      const budgetsDb = await import("../budgetsDb");
      await budgetsDb.approveBudget(input.id, input.clientSignature, input.clientSignatureName, input.approvedBy, input.changedByType);

      let osId: number | null = null;
      if (input.createOs) {
        const budget = await budgetsDb.getBudgetById(input.id);
        if (budget) {
          const workOrdersDb = await import("../workOrdersDb");
          const osResult = await workOrdersDb.createWorkOrder({
            adminId: budget.adminId,
            clientId: budget.clientId,
            type: budget.serviceType as any,
            priority: budget.priority as any,
            title: budget.title,
            description: `${budget.description ?? ''}\n\n[Gerado a partir do Orçamento ${budget.budgetNumber}]`.trim(),
            status: "aberta",
            estimatedValue: budget.totalValue != null ? budget.totalValue / 100 : undefined,
            internalNotes: `Orçamento de origem: ${budget.budgetNumber}`,
          } as any);
          osId = osResult.id;
          await budgetsDb.linkGeneratedOs(input.id, osId);

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

  reject: publicProcedure
    .input(z.object({
      id: z.number(),
      rejectionReason: z.string().min(1),
      rejectedBy: z.string(),
      changedByType: z.enum(["admin", "client"]),
    }))
    .mutation(async ({ input }) => {
      const budgetsDb = await import("../budgetsDb");
      await budgetsDb.rejectBudget(input.id, input.rejectionReason, input.rejectedBy, input.changedByType);
      return { success: true, message: "Orçamento reprovado" };
    }),

  getHistory: publicProcedure
    .input(z.object({ budgetId: z.number() }))
    .query(async ({ input }) => {
      const budgetsDb = await import("../budgetsDb");
      return await budgetsDb.getBudgetHistory(input.budgetId);
    }),

  getMetrics: publicProcedure
    .input(z.object({ adminId: z.number() }))
    .query(async ({ input }) => {
      const budgetsDb = await import("../budgetsDb");
      return await budgetsDb.getBudgetMetrics(input.adminId);
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const budgetsDb = await import("../budgetsDb");
      await budgetsDb.deleteBudget(input.id);
      return { success: true, message: "Orçamento deletado com sucesso" };
    }),

  exportPDF: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const pdfGen = await import("../pdfGenerator");
      const pdfBuffer = await pdfGen.generateBudgetPDF(input.id);
      const budgetsDb = await import("../budgetsDb");
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

  generateOs: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const budgetsDb = await import("../budgetsDb");
      const budget = await budgetsDb.getBudgetById(input.id);
      if (!budget) throw new TRPCError({ code: "NOT_FOUND", message: "Orçamento não encontrado" });
      if (budget.status !== "aprovado") throw new TRPCError({ code: "BAD_REQUEST", message: "Orçamento precisa estar aprovado" });

      const workOrdersDb = await import("../workOrdersDb");
      if (budget.generatedOsId) {
        const existingOs = await workOrdersDb.getWorkOrderById(budget.generatedOsId);
        if (existingOs) throw new TRPCError({ code: "BAD_REQUEST", message: "OS já foi gerada para este orçamento" });
      }
      const osResult = await workOrdersDb.createWorkOrder({
        adminId: budget.adminId,
        clientId: budget.clientId,
        type: budget.serviceType as any,
        priority: budget.priority as any,
        title: budget.title,
        description: `${budget.description ?? ''}\n\n[Gerado a partir do Orçamento ${budget.budgetNumber}]`.trim(),
        status: "aberta",
        estimatedValue: budget.totalValue != null ? budget.totalValue / 100 : undefined,
        internalNotes: `Orçamento de origem: ${budget.budgetNumber}`,
      } as any);

      await budgetsDb.linkGeneratedOs(input.id, osResult.id);
      return { success: true, osId: osResult.id };
    }),

  shareToPortal: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const budgetsDb = await import("../budgetsDb");
      await budgetsDb.updateBudget(input.id, { sharedWithPortal: 1 }, "admin");
      return { success: true };
    }),

  getForPortal: publicProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      const budgetsDb = await import("../budgetsDb");
      return await budgetsDb.listBudgets({
        clientId: input.clientId,
        sortBy: "createdAt",
        sortOrder: "desc",
        limit: 50,
      });
    }),
});
