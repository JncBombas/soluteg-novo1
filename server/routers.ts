import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from "@trpc/server";
import crypto from "crypto";
import { authenticateAdmin, hashPassword } from "./adminAuth";
import { sendInviteNotification, generateInviteLink } from "./inviteNotification";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  reports: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getReportsByUserId(ctx.user.id);
    }),
    
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const report = await db.getReportById(input.id);
        if (!report || report.userId !== ctx.user.id) {
          throw new Error("Report not found or access denied");
        }
        return report;
      }),
    
    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1),
        clientName: z.string().min(1),
        serviceType: z.string().min(1),
        serviceDate: z.date(),
        location: z.string().min(1),
        description: z.string().min(1),
        equipmentDetails: z.string().optional(),
        workPerformed: z.string().min(1),
        partsUsed: z.string().optional(),
        technicianName: z.string().min(1),
        observations: z.string().optional(),
        status: z.enum(["draft", "completed", "reviewed"]).default("draft"),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.createReport({
          ...input,
          userId: ctx.user.id,
        });
        return { success: true };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).optional(),
        clientName: z.string().min(1).optional(),
        serviceType: z.string().min(1).optional(),
        serviceDate: z.date().optional(),
        location: z.string().min(1).optional(),
        description: z.string().min(1).optional(),
        equipmentDetails: z.string().optional(),
        workPerformed: z.string().min(1).optional(),
        partsUsed: z.string().optional(),
        technicianName: z.string().min(1).optional(),
        observations: z.string().optional(),
        status: z.enum(["draft", "completed", "reviewed"]).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        const report = await db.getReportById(id);
        if (!report || report.userId !== ctx.user.id) {
          throw new Error("Report not found or access denied");
        }
        await db.updateReport(id, data);
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const report = await db.getReportById(input.id);
        if (!report || report.userId !== ctx.user.id) {
          throw new Error("Report not found or access denied");
        }
        await db.deleteReport(input.id);
        return { success: true };
      }),
  }),

  users: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can list users" });
      }
      return await db.getAllUsers();
    }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can delete users" });
        }
        await db.deleteUser(input.id);
        return { success: true };
      }),

    updateRole: protectedProcedure
      .input(z.object({ id: z.number(), role: z.enum(["user", "admin"]) }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can update roles" });
        }
        await db.updateUserRole(input.id, input.role);
        return { success: true };
      }),
  }),

  invites: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can list invites" });
      }
      return await db.getInvites();
    }),

    create: protectedProcedure
      .input(z.object({
        email: z.string().email(),
        role: z.enum(["user", "admin"]).default("user"),
        whatsappNumber: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can create invites" });
        }
        const code = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await db.createInvite({
          email: input.email,
          code,
          role: input.role,
          expiresAt,
        });
        const inviteLink = generateInviteLink(code);
        await sendInviteNotification(input.email, code, input.whatsappNumber);
        return { success: true, code, inviteLink };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can delete invites" });
        }
        await db.deleteInvite(input.id);
        return { success: true };
      }),
  }),

  invitesAccept: router({
    accept: publicProcedure
      .input(z.object({
        code: z.string(),
        name: z.string().min(1),
        password: z.string().min(6),
      }))
      .mutation(async ({ input }) => {
        try {
          const hashedPassword = await hashPassword(input.password);
          await db.acceptInvite(input.code, input.name, hashedPassword);
          return { success: true, message: "Conta criada com sucesso!" };
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error instanceof Error ? error.message : "Erro ao aceitar convite",
          });
        }
      }),
  }),

  adminAuth: router({
    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(6),
      }))
      .mutation(async ({ input, ctx }) => {
        try {
          const result = await authenticateAdmin(input.email, input.password);
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
      })
  }),
});

export type AppRouter = typeof appRouter;
