import * as db from "../db";
import { publicProcedure, router } from "../_core/trpc";
import { z } from "zod";

export const adminDocumentsRouter = router({
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
});
