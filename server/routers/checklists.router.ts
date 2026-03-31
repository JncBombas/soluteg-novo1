import { publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const checklistsRouter = router({
  templates: router({
    list: publicProcedure.query(async () => {
      const checklistDb = await import("../checklistsDb");
      return await checklistDb.getAllTemplates();
    }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const checklistDb = await import("../checklistsDb");
        return await checklistDb.getTemplateById(input.id);
      }),

    getBySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        const checklistDb = await import("../checklistsDb");
        return await checklistDb.getTemplateBySlug(input.slug);
      }),
  }),

  inspectionTasks: router({
    listByWorkOrder: publicProcedure
      .input(z.object({ workOrderId: z.number() }))
      .query(async ({ input }) => {
        const checklistDb = await import("../checklistsDb");
        return await checklistDb.getInspectionTasksByWorkOrder(input.workOrderId);
      }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const checklistDb = await import("../checklistsDb");
        return await checklistDb.getInspectionTaskById(input.id);
      }),

    getFull: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const checklistDb = await import("../checklistsDb");
        return await checklistDb.getFullInspectionTask(input.id);
      }),

    create: publicProcedure
      .input(z.object({
        workOrderId: z.number(),
        title: z.string().min(1),
        description: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const checklistDb = await import("../checklistsDb");
        const id = await checklistDb.createInspectionTask(input);
        return { success: true, id, message: "Tarefa de inspeção criada com sucesso" };
      }),

    updateStatus: publicProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["pendente", "em_andamento", "concluida"]),
      }))
      .mutation(async ({ input }) => {
        const checklistDb = await import("../checklistsDb");
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
        const checklistDb = await import("../checklistsDb");
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
        const checklistDb = await import("../checklistsDb");
        await checklistDb.deleteInspectionTask(input.id);
        return { success: true, message: "Tarefa deletada com sucesso" };
      }),

    canComplete: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async () => {
        return true;
      }),
  }),

  instances: router({
    listByTask: publicProcedure
      .input(z.object({ inspectionTaskId: z.number() }))
      .query(async ({ input }) => {
        const checklistDb = await import("../checklistsDb");
        return await checklistDb.getChecklistsByInspectionTask(input.inspectionTaskId);
      }),

    listByWorkOrder: publicProcedure
      .input(z.object({ workOrderId: z.number() }))
      .query(async ({ input }) => {
        const checklistDb = await import("../checklistsDb");
        return await checklistDb.getChecklistsByWorkOrderId(input.workOrderId);
      }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const checklistDb = await import("../checklistsDb");
        return await checklistDb.getChecklistInstanceById(input.id);
      }),

    getWithTemplate: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const checklistDb = await import("../checklistsDb");
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
        const checklistDb = await import("../checklistsDb");
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
        const checklistDb = await import("../checklistsDb");
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
        const checklistDb = await import("../checklistsDb");
        const { id, ...data } = input;
        await checklistDb.updateChecklistInstance(id, data);
        return { success: true, message: "Checklist atualizado com sucesso" };
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const checklistDb = await import("../checklistsDb");
        await checklistDb.deleteChecklistInstance(input.id);
        return { success: true, message: "Checklist deletado com sucesso" };
      }),
  }),
});
