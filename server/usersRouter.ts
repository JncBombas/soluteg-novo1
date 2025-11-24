import { protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from "@trpc/server";
import crypto from "crypto";
import { hashPassword } from "./adminAuth";

export const usersRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    // Only admins can list users
    if (ctx.user?.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    return await db.getAllUsers();
  }),

  create: protectedProcedure
    .input(z.object({
      email: z.string().email(),
      role: z.enum(["user", "admin"]),
    }))
    .mutation(async ({ input, ctx }) => {
      // Only admins can create users
      if (ctx.user?.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      try {
        // Generate a setup token
        const setupToken = crypto.randomBytes(32).toString("hex");
        const setupLink = `${process.env.VITE_APP_URL || "https://soluteg.manus.space"}/setup-password?token=${setupToken}`;

        // Create user with temporary password
        const tempPassword = crypto.randomBytes(16).toString("hex");
        const hashedPassword = await hashPassword(tempPassword);

        await db.createUser({
          email: input.email,
          password: hashedPassword,
          role: input.role,
          setupToken,
          setupTokenExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        });

        return {
          success: true,
          message: `Usuário ${input.email} criado com sucesso!`,
          setupLink,
          email: input.email,
        };
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Erro ao criar usuário",
        });
      }
    }),

  delete: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      // Only admins can delete users
      if (ctx.user?.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      try {
        await db.deleteUser(input.userId);
        return { success: true, message: "Usuário deletado com sucesso!" };
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Erro ao deletar usuário",
        });
      }
    }),

  updateRole: protectedProcedure
    .input(z.object({
      userId: z.number(),
      role: z.enum(["user", "admin"]),
    }))
    .mutation(async ({ input, ctx }) => {
      // Only admins can update roles
      if (ctx.user?.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      try {
        await db.updateUserRole(input.userId, input.role);
        return { success: true, message: "Função atualizada com sucesso!" };
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Erro ao atualizar função",
        });
      }
    }),
});
