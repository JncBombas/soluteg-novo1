import { publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as technicianDb from "../technicianDb";

export const technicianPortalRouter = router({
  getMyWorkOrders: publicProcedure
    .input(z.object({ technicianId: z.number() }))
    .query(async ({ input }) => {
      return await technicianDb.getWorkOrdersByTechnicianId(input.technicianId);
    }),

  getWorkOrderById: publicProcedure
    .input(z.object({ id: z.number(), technicianId: z.number() }))
    .query(async ({ input }) => {
      return await technicianDb.getWorkOrderByIdForTechnician(input.id, input.technicianId);
    }),

  updateStatus: publicProcedure
    .input(z.object({
      workOrderId:  z.number(),
      technicianId: z.number(),
      newStatus:    z.enum(["em_andamento", "concluida"]),
      notes:        z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const os = await technicianDb.getWorkOrderByIdForTechnician(input.workOrderId, input.technicianId);
      if (!os) {
        throw new TRPCError({ code: "NOT_FOUND", message: "OS não encontrada ou acesso negado" });
      }

      const workOrdersDb = await import("../workOrdersDb");

      const updateData: Record<string, unknown> = { status: input.newStatus };
      if (input.newStatus === "em_andamento") updateData.startedAt = new Date();
      if (input.newStatus === "concluida")    updateData.completedAt = new Date();

      await workOrdersDb.updateWorkOrder(input.workOrderId, updateData as any);

      await workOrdersDb.addWorkOrderHistory({
        workOrderId:    input.workOrderId,
        changedBy:      `technician-${input.technicianId}`,
        changedByType:  "technician",
        previousStatus: os.status,
        newStatus:      input.newStatus,
        notes:          input.notes,
      });

      return { success: true };
    }),
});
