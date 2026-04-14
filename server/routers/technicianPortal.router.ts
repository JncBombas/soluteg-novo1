import { protectedTechnicianProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as technicianDb from "../technicianDb";
import * as workOrdersDb from "../workOrdersDb";

export const technicianPortalRouter = router({
  getMyWorkOrders: protectedTechnicianProcedure
    .query(async ({ ctx }) => {
      return await technicianDb.getWorkOrdersByTechnicianId(ctx.technicianId);
    }),

  getWorkOrderById: protectedTechnicianProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      return await technicianDb.getWorkOrderByIdForTechnician(input.id, ctx.technicianId);
    }),

  updateStatus: protectedTechnicianProcedure
    .input(z.object({
      workOrderId:  z.number(),
      newStatus:    z.enum(["em_andamento", "pausada", "concluida"]),
      notes:        z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const os = await technicianDb.getWorkOrderByIdForTechnician(input.workOrderId, ctx.technicianId);
      if (!os) {
        throw new TRPCError({ code: "NOT_FOUND", message: "OS não encontrada ou acesso negado" });
      }

      // Só pode concluir se já assinou
      if (input.newStatus === "concluida") {
        const full = await workOrdersDb.getWorkOrderById(input.workOrderId);
        if (!full?.technicianSignature) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "É necessário assinar a OS antes de finalizá-la.",
          });
        }
      }

      const updateData: Record<string, unknown> = { status: input.newStatus };
      if (input.newStatus === "em_andamento") updateData.startedAt = new Date();
      if (input.newStatus === "concluida")    updateData.completedAt = new Date();
      if (input.newStatus === "pausada")      updateData.pausedAt = new Date();

      await workOrdersDb.updateWorkOrder(input.workOrderId, updateData as any);

      await workOrdersDb.addWorkOrderHistory({
        workOrderId:    input.workOrderId,
        changedBy:      `technician-${ctx.technicianId}`,
        changedByType:  "technician",
        previousStatus: os.status,
        newStatus:      input.newStatus,
        notes:          input.notes,
      });

      return { success: true };
    }),

  saveSignature: protectedTechnicianProcedure
    .input(z.object({
      workOrderId: z.number(),
      signature:   z.string().min(10),
    }))
    .mutation(async ({ input, ctx }) => {
      const os = await technicianDb.getWorkOrderByIdForTechnician(input.workOrderId, ctx.technicianId);
      if (!os) {
        throw new TRPCError({ code: "NOT_FOUND", message: "OS não encontrada ou acesso negado" });
      }
      if (os.status !== "em_andamento" && os.status !== "pausada") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "A OS precisa estar em andamento para assinar." });
      }
      await workOrdersDb.saveTechnicianSignature(input.workOrderId, ctx.technicianId, input.signature);
      return { success: true };
    }),

  // ==================== TASKS ====================
  tasks: router({
    list: protectedTechnicianProcedure
      .input(z.object({ workOrderId: z.number() }))
      .query(async ({ input, ctx }) => {
        const os = await technicianDb.getWorkOrderByIdForTechnician(input.workOrderId, ctx.technicianId);
        if (!os) throw new TRPCError({ code: "NOT_FOUND", message: "OS não encontrada ou acesso negado" });
        const auxDb = await import("../workOrdersAuxDb");
        return await auxDb.getTasksByWorkOrderId(input.workOrderId);
      }),

    toggle: protectedTechnicianProcedure
      .input(z.object({
        workOrderId:  z.number(),
        taskId:       z.number(),
        isCompleted:  z.boolean(),
      }))
      .mutation(async ({ input, ctx }) => {
        const os = await technicianDb.getWorkOrderByIdForTechnician(input.workOrderId, ctx.technicianId);
        if (!os) throw new TRPCError({ code: "NOT_FOUND", message: "OS não encontrada ou acesso negado" });
        if (os.status !== "em_andamento" && os.status !== "pausada") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "A OS precisa estar em andamento para marcar tarefas." });
        }
        const technician = await technicianDb.getTechnicianById(ctx.technicianId);
        const auxDb = await import("../workOrdersAuxDb");
        await auxDb.toggleTaskCompletion(
          input.taskId,
          input.isCompleted,
          technician?.name || `Técnico ${ctx.technicianId}`,
        );
        return { success: true };
      }),
  }),

  // ==================== COMMENTS ====================
  comments: router({
    list: protectedTechnicianProcedure
      .input(z.object({ workOrderId: z.number() }))
      .query(async ({ input, ctx }) => {
        const os = await technicianDb.getWorkOrderByIdForTechnician(input.workOrderId, ctx.technicianId);
        if (!os) throw new TRPCError({ code: "NOT_FOUND", message: "OS não encontrada ou acesso negado" });
        const auxDb = await import("../workOrdersAuxDb");
        return await auxDb.getCommentsByWorkOrderId(input.workOrderId, true);
      }),

    create: protectedTechnicianProcedure
      .input(z.object({
        workOrderId: z.number(),
        comment:     z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const os = await technicianDb.getWorkOrderByIdForTechnician(input.workOrderId, ctx.technicianId);
        if (!os) throw new TRPCError({ code: "NOT_FOUND", message: "OS não encontrada ou acesso negado" });
        if (os.status !== "em_andamento" && os.status !== "pausada") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "A OS precisa estar em andamento para adicionar comentários." });
        }
        const auxDb = await import("../workOrdersAuxDb");
        await auxDb.createComment({
          workOrderId: input.workOrderId,
          userId:      `tecnico-${ctx.technicianId}`,
          userType:    "admin",
          comment:     input.comment,
          isInternal:  1,
        });
        return { success: true };
      }),
  }),

  // ==================== ATTACHMENTS ====================
  attachments: router({
    list: protectedTechnicianProcedure
      .input(z.object({ workOrderId: z.number() }))
      .query(async ({ input, ctx }) => {
        const os = await technicianDb.getWorkOrderByIdForTechnician(input.workOrderId, ctx.technicianId);
        if (!os) throw new TRPCError({ code: "NOT_FOUND", message: "OS não encontrada ou acesso negado" });
        const auxDb = await import("../workOrdersAuxDb");
        return await auxDb.getAttachmentsByWorkOrderId(input.workOrderId);
      }),

    create: protectedTechnicianProcedure
      .input(z.object({
        workOrderId: z.number(),
        fileName:    z.string().min(1),
        fileKey:     z.string().min(1),
        fileUrl:     z.string().min(1),
        fileType:    z.string().optional(),
        fileSize:    z.number().optional(),
        category:    z.enum(["before", "during", "after", "document", "other"]).default("during"),
      }))
      .mutation(async ({ input, ctx }) => {
        const os = await technicianDb.getWorkOrderByIdForTechnician(input.workOrderId, ctx.technicianId);
        if (!os) throw new TRPCError({ code: "NOT_FOUND", message: "OS não encontrada ou acesso negado" });
        if (os.status !== "em_andamento" && os.status !== "pausada") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "A OS precisa estar em andamento para adicionar anexos." });
        }
        const auxDb = await import("../workOrdersAuxDb");
        await auxDb.createAttachment({
          ...input,
          uploadedBy: `tecnico-${ctx.technicianId}`,
        });
        return { success: true };
      }),
  }),

  // ==================== CHECKLISTS ====================
  checklists: router({
    // Lista templates disponíveis (apenas estrutura, sem dados de negócio)
    listTemplates: protectedTechnicianProcedure
      .query(async () => {
        const checklistDb = await import("../checklistsDb");
        return await checklistDb.getAllTemplates();
      }),

    // Lista checklists da OS — verifica ownership via technicianId
    listByWorkOrder: protectedTechnicianProcedure
      .input(z.object({ workOrderId: z.number() }))
      .query(async ({ input, ctx }) => {
        const os = await technicianDb.getWorkOrderByIdForTechnician(input.workOrderId, ctx.technicianId);
        if (!os) throw new TRPCError({ code: "NOT_FOUND", message: "OS não encontrada ou acesso negado" });
        const checklistDb = await import("../checklistsDb");
        return await checklistDb.getChecklistsByWorkOrderId(input.workOrderId);
      }),

    // Salva respostas — verifica que o checklist pertence a uma OS do técnico
    updateResponses: protectedTechnicianProcedure
      .input(z.object({
        checklistId: z.number(),
        workOrderId: z.number(),
        responses:   z.record(z.string(), z.unknown()),
        isComplete:  z.boolean(),
      }))
      .mutation(async ({ input, ctx }) => {
        const os = await technicianDb.getWorkOrderByIdForTechnician(input.workOrderId, ctx.technicianId);
        if (!os) throw new TRPCError({ code: "NOT_FOUND", message: "OS não encontrada ou acesso negado" });
        if (os.status !== "em_andamento" && os.status !== "pausada") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "A OS precisa estar em andamento para preencher checklists." });
        }
        // Verifica que o checklistId pertence de fato a esta OS
        const checklistDb = await import("../checklistsDb");
        const instance = await checklistDb.getChecklistInstanceById(input.checklistId);
        if (!instance) throw new TRPCError({ code: "NOT_FOUND", message: "Checklist não encontrado" });
        // Busca a inspectionTask para confirmar que pertence à OS correta
        const task = await checklistDb.getInspectionTaskById(instance.inspectionTaskId);
        if (!task || task.workOrderId !== input.workOrderId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Checklist não pertence a esta OS" });
        }
        await checklistDb.updateChecklistResponses(input.checklistId, input.responses, input.isComplete);
        return { success: true };
      }),
  }),
});
