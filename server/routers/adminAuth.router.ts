import * as db from "../db";
import { getSessionCookieOptions } from "../_core/cookies";
import { publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import crypto from "crypto";
import { authenticateAdmin, hashPassword, verifyPassword } from "../adminAuth";

export const adminAuthRouter = router({
  login: publicProcedure
    .input(z.object({
      username: z.string().min(1),
      password: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await authenticateAdmin(input.username, input.password);
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.setHeader('Set-Cookie', `admin_token=${result.token}; ${Object.entries(cookieOptions).map(([k, v]) => `${k}=${v}`).join('; ')}`);
        return result;
      } catch (error) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: error instanceof Error ? error.message : "Login failed",
        });
      }
    }),

  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie('admin_token', { ...cookieOptions, maxAge: -1 });
    return { success: true };
  }),

  requestReset: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      const admin = await db.getAdminByEmail(input.email);
      if (!admin) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Admin nao encontrado" });
      }
      const resetToken = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000);
      await db.createPasswordReset(input.email, resetToken, expiresAt);
      return { success: true, message: "Link de reset enviado para seu e-mail" };
    }),

  resetPassword: publicProcedure
    .input(z.object({
      token: z.string(),
      password: z.string().min(6),
    }))
    .mutation(async ({ input }) => {
      const hashedPassword = await hashPassword(input.password);
      await db.updateAdminPassword(1, hashedPassword);
      return { success: true, message: "Senha redefinida com sucesso" };
    }),

  changePassword: publicProcedure
    .input(z.object({
      adminId: z.number(),
      currentPassword: z.string().min(6),
      newPassword: z.string().min(6),
    }))
    .mutation(async ({ input }) => {
      const admin = await db.getAdminById(input.adminId);
      if (!admin) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Admin nao encontrado" });
      }
      const isValid = await verifyPassword(input.currentPassword, admin.password);
      if (!isValid) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Senha atual incorreta" });
      }
      const hashedPassword = await hashPassword(input.newPassword);
      await db.updateAdminPassword(input.adminId, hashedPassword);
      return { success: true, message: "Senha alterada com sucesso" };
    }),

  updateCustomLabel: publicProcedure
    .input(z.object({
      adminId: z.number(),
      customLabel: z.string().min(1).max(255),
    }))
    .mutation(async ({ input }) => {
      await db.updateAdminCustomLabel(input.adminId, input.customLabel);
      return { success: true, message: "Label customizado atualizado com sucesso" };
    }),
});
