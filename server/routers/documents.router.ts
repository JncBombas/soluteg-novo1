import * as db from "../db";
import { publicProcedure, router } from "../_core/trpc";
import { z } from "zod";

export const documentsRouter = router({
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
      await db.createClientDocument(input);
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
});
