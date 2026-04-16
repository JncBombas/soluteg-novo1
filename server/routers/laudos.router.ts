import { adminLocalProcedure, protectedTechnicianProcedure, publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const laudosRouter = router({
  // ── Listar laudos (admin: todos; técnico: só os seus) ──────────────────────
  list: adminLocalProcedure
    .input(z.object({
      tipo: z.string().optional(),
      status: z.string().optional(),
      clienteId: z.number().optional(),
      search: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await import("../laudosDb");
      return await db.listLaudos(input);
    }),

  listTecnico: protectedTechnicianProcedure
    .input(z.object({
      tipo: z.string().optional(),
      status: z.string().optional(),
      search: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await import("../laudosDb");
      return await db.listLaudos({
        ...input,
        criadoPor: ctx.technicianId,
        criadoPorTipo: "tecnico",
      });
    }),

  // ── Buscar por ID ──────────────────────────────────────────────────────────
  getById: adminLocalProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await import("../laudosDb");
      const laudo = await db.getLaudoById(input.id);
      if (!laudo) throw new TRPCError({ code: "NOT_FOUND", message: "Laudo não encontrado" });
      return laudo;
    }),

  getByIdTecnico: protectedTechnicianProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await import("../laudosDb");
      const laudo = await db.getLaudoById(input.id);
      if (!laudo) throw new TRPCError({ code: "NOT_FOUND", message: "Laudo não encontrado" });
      if (laudo.criadoPor !== ctx.technicianId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
      }
      return laudo;
    }),

  // ── Criar laudo ────────────────────────────────────────────────────────────
  create: adminLocalProcedure
    .input(z.object({
      tipo: z.enum(["instalacao_eletrica", "inspecao_predial", "nr10_nr12", "grupo_gerador", "adequacoes"]),
      titulo: z.string().min(1),
      clienteId: z.number().optional(),
      osId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await import("../laudosDb");
      const result = await db.createLaudo({
        ...input,
        criadoPor: ctx.adminId,
        criadoPorTipo: "admin",
      });
      return { success: true, ...result };
    }),

  createTecnico: protectedTechnicianProcedure
    .input(z.object({
      tipo: z.enum(["instalacao_eletrica", "inspecao_predial", "nr10_nr12", "grupo_gerador", "adequacoes"]),
      titulo: z.string().min(1),
      clienteId: z.number().optional(),
      osId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await import("../laudosDb");
      const result = await db.createLaudo({
        ...input,
        criadoPor: ctx.technicianId,
        criadoPorTipo: "tecnico",
      });
      return { success: true, ...result };
    }),

  // ── Atualizar laudo ────────────────────────────────────────────────────────
  update: adminLocalProcedure
    .input(z.object({
      id: z.number(),
      tipo: z.enum(["instalacao_eletrica", "inspecao_predial", "nr10_nr12", "grupo_gerador", "adequacoes"]).optional(),
      titulo: z.string().optional(),
      clienteId: z.number().nullable().optional(),
      osId: z.number().nullable().optional(),
      objeto: z.string().optional(),
      metodologia: z.string().optional(),
      equipamentosUtilizados: z.string().optional(),
      condicoesLocal: z.string().optional(),
      constatacoes: z.array(z.object({
        item: z.string(),
        descricao: z.string(),
        status: z.enum(["conforme", "nao_conforme", "atencao"]),
        referenciaNormativa: z.string().optional(),
      })).optional(),
      conclusaoParecer: z.enum(["conforme", "nao_conforme", "parcialmente_conforme"]).nullable().optional(),
      conclusaoTexto: z.string().optional(),
      recomendacoes: z.string().optional(),
      normasReferencia: z.array(z.object({
        codigo: z.string(),
        titulo: z.string(),
      })).optional(),
      validadeMeses: z.number().optional(),
      dataInspecao: z.string().nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, dataInspecao, ...rest } = input;
      const db = await import("../laudosDb");
      await db.updateLaudo(id, {
        ...rest,
        dataInspecao: dataInspecao ? new Date(dataInspecao) : (dataInspecao === null ? null : undefined),
      } as any);
      return { success: true };
    }),

  updateTecnico: protectedTechnicianProcedure
    .input(z.object({
      id: z.number(),
      tipo: z.enum(["instalacao_eletrica", "inspecao_predial", "nr10_nr12", "grupo_gerador", "adequacoes"]).optional(),
      titulo: z.string().optional(),
      clienteId: z.number().nullable().optional(),
      osId: z.number().nullable().optional(),
      objeto: z.string().optional(),
      metodologia: z.string().optional(),
      equipamentosUtilizados: z.string().optional(),
      condicoesLocal: z.string().optional(),
      constatacoes: z.array(z.object({
        item: z.string(),
        descricao: z.string(),
        status: z.enum(["conforme", "nao_conforme", "atencao"]),
        referenciaNormativa: z.string().optional(),
      })).optional(),
      conclusaoParecer: z.enum(["conforme", "nao_conforme", "parcialmente_conforme"]).nullable().optional(),
      conclusaoTexto: z.string().optional(),
      recomendacoes: z.string().optional(),
      normasReferencia: z.array(z.object({
        codigo: z.string(),
        titulo: z.string(),
      })).optional(),
      validadeMeses: z.number().optional(),
      dataInspecao: z.string().nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await import("../laudosDb");
      const laudo = await db.getLaudoById(input.id);
      if (!laudo) throw new TRPCError({ code: "NOT_FOUND", message: "Laudo não encontrado" });
      if (laudo.criadoPor !== ctx.technicianId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
      }
      if (laudo.status !== "rascunho") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Laudo finalizado não pode ser editado" });
      }
      const { id, dataInspecao, ...rest } = input;
      await db.updateLaudo(id, {
        ...rest,
        dataInspecao: dataInspecao ? new Date(dataInspecao) : (dataInspecao === null ? null : undefined),
      } as any);
      return { success: true };
    }),

  // ── Deletar laudo (somente rascunho, somente admin) ───────────────────────
  delete: adminLocalProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await import("../laudosDb");
      const laudo = await db.getLaudoById(input.id);
      if (!laudo) throw new TRPCError({ code: "NOT_FOUND", message: "Laudo não encontrado" });
      if (laudo.status !== "rascunho") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas laudos em rascunho podem ser excluídos" });
      }
      await db.deleteLaudo(input.id);
      return { success: true };
    }),

  // ── Finalizar laudo ────────────────────────────────────────────────────────
  finalize: adminLocalProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await import("../laudosDb");
      const laudo = await db.getLaudoById(input.id);
      if (!laudo) throw new TRPCError({ code: "NOT_FOUND", message: "Laudo não encontrado" });
      await db.updateLaudo(input.id, { status: "finalizado" } as any);
      return { success: true };
    }),

  // ── Fotos ──────────────────────────────────────────────────────────────────
  addFoto: adminLocalProcedure
    .input(z.object({
      laudoId: z.number(),
      url: z.string(),
      legenda: z.string().optional(),
      comentario: z.string().optional(),
      classificacao: z.enum(["conforme", "nao_conforme", "atencao"]).optional(),
      ordem: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await import("../laudosDb");
      await db.addLaudoFoto(input);
      return { success: true };
    }),

  addFotoTecnico: protectedTechnicianProcedure
    .input(z.object({
      laudoId: z.number(),
      url: z.string(),
      legenda: z.string().optional(),
      comentario: z.string().optional(),
      classificacao: z.enum(["conforme", "nao_conforme", "atencao"]).optional(),
      ordem: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await import("../laudosDb");
      const laudo = await db.getLaudoById(input.laudoId);
      if (!laudo || laudo.criadoPor !== ctx.technicianId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
      }
      await db.addLaudoFoto(input);
      return { success: true };
    }),

  updateFoto: adminLocalProcedure
    .input(z.object({
      id: z.number(),
      legenda: z.string().optional(),
      comentario: z.string().optional(),
      classificacao: z.enum(["conforme", "nao_conforme", "atencao"]).optional(),
      ordem: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const db = await import("../laudosDb");
      await db.updateLaudoFoto(id, data as any);
      return { success: true };
    }),

  removeFoto: adminLocalProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await import("../laudosDb");
      await db.removeLaudoFoto(input.id);
      return { success: true };
    }),

  // ── Medições ───────────────────────────────────────────────────────────────
  addMedicao: adminLocalProcedure
    .input(z.object({
      laudoId: z.number(),
      descricao: z.string().min(1),
      unidade: z.string().optional(),
      valorMedido: z.string().optional(),
      valorReferencia: z.string().optional(),
      resultado: z.enum(["aprovado", "reprovado"]).optional(),
      ordem: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await import("../laudosDb");
      await db.addLaudoMedicao(input);
      return { success: true };
    }),

  removeMedicao: adminLocalProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await import("../laudosDb");
      await db.removeLaudoMedicao(input.id);
      return { success: true };
    }),

  // ── Gerar PDF ──────────────────────────────────────────────────────────────
  generatePdf: adminLocalProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const { generateLaudoPDF } = await import("../pdfLaudo");
      const pdfBuffer = await generateLaudoPDF(input.id);
      const db = await import("../laudosDb");
      const laudo = await db.getLaudoById(input.id);
      return {
        success: true,
        pdf: pdfBuffer.toString("base64"),
        filename: `${laudo?.numero ?? `LAU-${input.id}`}.pdf`,
      };
    }),

  // ── Configurações do Técnico ───────────────────────────────────────────────
  getTecnico: adminLocalProcedure
    .query(async () => {
      const db = await import("../laudosDb");
      return await db.getConfiguracoesTecnico();
    }),

  updateTecnicoConfig: adminLocalProcedure
    .input(z.object({
      nomeCompleto: z.string().optional(),
      registroCrt: z.string().optional(),
      especialidade: z.string().optional(),
      empresa: z.string().optional(),
      cidade: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await import("../laudosDb");
      await db.upsertConfiguracoesTecnico(input);
      return { success: true };
    }),
});
