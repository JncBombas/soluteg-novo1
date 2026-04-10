import * as db from "../db";
import { adminLocalProcedure, publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

const adminDocumentsSubRouter = router({
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

  updateFile: adminLocalProcedure
    .input(z.object({
      id: z.number(),
      fileUrl: z.string().url(),
    }))
    .mutation(async ({ input }) => {
      await db.updateDocumentFile(input.id, input.fileUrl);
      return { success: true, message: "Arquivo atualizado com sucesso" };
    }),
});

export const adminProfileRouter = router({
  getProfile: adminLocalProcedure
    .query(async ({ ctx }) => {
      const admin = await db.getAdminById(ctx.adminId);
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

  updateProfile: adminLocalProcedure
    .input(z.object({
      name: z.string().min(1).optional(),
      phone: z.string().optional(),
      profilePhoto: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await db.updateAdminProfile(ctx.adminId, input);
      return { success: true, message: "Perfil atualizado com sucesso" };
    }),

  adminDocuments: adminDocumentsSubRouter,
});
