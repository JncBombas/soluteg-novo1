import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";

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
});

export type AppRouter = typeof appRouter;
