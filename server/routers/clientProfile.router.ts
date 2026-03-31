import * as db from "../db";
import { publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { hashPassword, comparePassword } from "../adminAuth";

export const clientProfileRouter = router({
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
        syndicName: client.syndicName,
        profilePhoto: client.profilePhoto,
        username: client.username,
      };
    }),

  uploadPhoto: publicProcedure
    .input(z.object({
      clientId: z.number(),
      imageBase64: z.string(),
    }))
    .mutation(async ({ input }) => {
      const { storagePut } = await import("../storage");
      const base64Data = input.imageBase64.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      if (buffer.length > 5 * 1024 * 1024) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Imagem muito grande. Máximo 5MB." });
      }
      const mimeMatch = input.imageBase64.match(/^data:(image\/\w+);base64,/);
      const contentType = mimeMatch ? mimeMatch[1] : "image/jpeg";
      const { url } = await storagePut(`client_photo_${input.clientId}`, buffer, contentType, "client_photos");
      await db.updateClient(input.clientId, { profilePhoto: url } as any);
      return { success: true, photoUrl: url };
    }),

  updateProfile: publicProcedure
    .input(z.object({
      clientId: z.number(),
      name: z.string().min(1).optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      syndicName: z.string().optional(),
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
});
