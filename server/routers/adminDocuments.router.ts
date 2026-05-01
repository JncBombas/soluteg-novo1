import * as db from "../db";
import { adminLocalProcedure, router } from "../_core/trpc";
import { z } from "zod";

export const adminDocumentsRouter = router({
  // Lista documentos do admin autenticado — adminId vem do JWT (ctx), não do input.
  list: adminLocalProcedure
    .query(async ({ ctx }) => {
      return await db.getDocumentsByAdminId(ctx.adminId);
    }),

  update: adminLocalProcedure
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

  delete: adminLocalProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteDocument(input.id);
      return { success: true, message: "Documento deletado com sucesso" };
    }),
});
