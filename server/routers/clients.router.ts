import * as db from "../db";
import { adminLocalProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { hashPassword } from "../adminAuth";

export const clientsRouter = router({
  list: adminLocalProcedure
    .input(z.object({
      adminId: z.number(),
      search: z.string().optional(),
    }))
    .query(async ({ input }) => {
      return await db.getClientsByAdminId(input.adminId);
    }),

  create: adminLocalProcedure
    .input(z.object({
      adminId: z.number(),
      name: z.string().min(1),
      email: z.string().email().optional().or(z.literal("")),
      username: z.string().max(100).optional().or(z.literal("")),
      password: z.string().optional().or(z.literal("")),
      cnpjCpf: z.string().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      syndicName: z.string().optional(),
      type: z.enum(["com_portal", "sem_portal"]).default("com_portal"),
    }))
    .mutation(async ({ input }) => {
      const { password, username, type, ...clientData } = input;

      if (type === "com_portal") {
        if (!username || username.length < 3) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Nome de usuário é obrigatório para clientes com portal (mínimo 3 caracteres)" });
        }
        if (!password || password.length < 6) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Senha é obrigatória para clientes com portal (mínimo 6 caracteres)" });
        }
      }

      const finalUsername = (type === "sem_portal" && (!username || !username.trim()))
        ? `_sp_${input.adminId}_${Date.now()}`
        : username!;
      const finalPassword = (type === "sem_portal" && (!password || !password.trim()))
        ? Math.random().toString(36) + Math.random().toString(36)
        : password!;

      const hashedPassword = await hashPassword(finalPassword);

      await db.createClient({
        ...clientData,
        username: finalUsername,
        type,
        email: clientData.email || null,
        password: hashedPassword,
        active: 1,
      });

      return { success: true, message: "Cliente criado com sucesso" };
    }),

  update: adminLocalProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      email: z.union([z.string().email(), z.literal("")]).optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      cnpjCpf: z.string().optional(),
      syndicName: z.string().optional(),
      profilePhoto: z.string().optional(),
      type: z.enum(["com_portal", "sem_portal"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input;
      try {
        await db.updateClient(id, updateData);
        return { success: true, message: "Cliente atualizado com sucesso" };
      } catch (error) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: error instanceof Error ? error.message : "Erro ao atualizar cliente",
        });
      }
    }),

  updatePassword: adminLocalProcedure
    .input(z.object({
      id: z.number(),
      newPassword: z.string().min(6),
    }))
    .mutation(async ({ input }) => {
      try {
        const hashedPassword = await hashPassword(input.newPassword);
        await db.updateClientPassword(input.id, hashedPassword);
        return { success: true, message: "Senha atualizada com sucesso" };
      } catch (error) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: error instanceof Error ? error.message : "Erro ao atualizar senha",
        });
      }
    }),

  delete: adminLocalProcedure
    .input(z.object({
      id: z.number().optional(),
      clientId: z.number().optional(),
      adminId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const id = input.id ?? input.clientId;
      if (!id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "ID do cliente não informado" });
      }
      await db.deleteClient(id);
      return { success: true, message: "Cliente deletado com sucesso" };
    }),

  getById: adminLocalProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await db.getClientById(input.id);
    }),

  getByUsername: adminLocalProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ input }) => {
      return await db.getClientByUsername(input.username);
    }),

  broadcastMessage: adminLocalProcedure
    .input(z.object({
      adminId: z.number(),
      message: z.string().min(1),
      targetType: z.enum(["all", "com_portal", "sem_portal", "selected"]),
      clientIds: z.array(z.number()).optional(),
    }))
    .mutation(async ({ input }) => {
      const allClients = await db.getClientsByAdminId(input.adminId);

      let targets = allClients;
      if (input.targetType === "com_portal") {
        targets = allClients.filter(c => c.type === "com_portal");
      } else if (input.targetType === "sem_portal") {
        targets = allClients.filter(c => c.type === "sem_portal");
      } else if (input.targetType === "selected") {
        const ids = new Set(input.clientIds ?? []);
        targets = allClients.filter(c => ids.has(c.id));
      }

      const { sendWhatsappToNumber } = await import("../whatsapp");

      const results: Array<{ id: number; name: string; phone: string; status: "sent" | "failed" | "skipped"; reason?: string }> = [];

      for (const client of targets) {
        if (!client.phone) {
          results.push({ id: client.id, name: client.name, phone: "", status: "skipped", reason: "Sem telefone cadastrado" });
          continue;
        }
        try {
          const firstName = client.name.split(" ")[0];
          const fullMessage = `Olá, ${firstName}! 👋\n\n📢 *COMUNICADO IMPORTANTE*\n\n${input.message}\n\nAgradecemos a sua confiança! 🙏\n*JNC Elétrica*`;
          await sendWhatsappToNumber(client.phone, fullMessage);
          results.push({ id: client.id, name: client.name, phone: client.phone, status: "sent" });
        } catch (err: any) {
          results.push({ id: client.id, name: client.name, phone: client.phone, status: "failed", reason: err?.message ?? "Erro desconhecido" });
        }
      }

      const sent = results.filter(r => r.status === "sent").length;
      const failed = results.filter(r => r.status === "failed").length;
      const skipped = results.filter(r => r.status === "skipped").length;

      return { total: targets.length, sent, failed, skipped, results };
    }),
});
