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
});
