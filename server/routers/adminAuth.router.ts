/**
 * adminAuth.router.ts
 *
 * Este arquivo define as rotas (endpoints) de autenticação do painel admin.
 * No tRPC, cada "procedure" equivale a um endpoint de API.
 * "mutation" é usado para operações que MODIFICAM dados (como login, logout, trocar senha).
 * "query" seria usado para operações que apenas LEEM dados.
 */

// Importa todas as funções do banco de dados (ex: buscar admin, salvar token de reset, etc.)
import * as db from "../db";

// Função que monta as opções do cookie de sessão (ex: seguro, httpOnly, etc.)
import { getSessionCookieOptions } from "../_core/cookies";

// "publicProcedure" = endpoint acessível sem autenticação | "router" = agrupa os endpoints
import { adminLocalProcedure, publicProcedure, router } from "../_core/trpc";

// Zod é uma biblioteca de validação de dados — garante que os dados recebidos são do tipo certo
import { z } from "zod";

// TRPCError é a forma padrão de lançar erros dentro do tRPC com um código HTTP correspondente
import { TRPCError } from "@trpc/server";

// Módulo nativo do Node.js para gerar bytes aleatórios (usado no token de reset de senha)
import crypto from "crypto";

// Funções auxiliares de autenticação: verificar credenciais, gerar hash e comparar senhas
import { authenticateAdmin, hashPassword, verifyPassword } from "../adminAuth";

export const adminAuthRouter = router({

  // ──────────────────────────────────────────────
  // ME — retorna dados do admin autenticado via cookie
  // ──────────────────────────────────────────────
  me: adminLocalProcedure.query(async ({ ctx }) => {
    const admin = await db.getAdminById(ctx.adminId);
    if (!admin) throw new TRPCError({ code: "UNAUTHORIZED", message: "Admin não encontrado" });
    const { password: _pw, ...rest } = admin;
    return rest;
  }),

  // ──────────────────────────────────────────────
  // LOGIN
  // Recebe usuário e senha, verifica as credenciais e salva um cookie de sessão no navegador.
  // ──────────────────────────────────────────────
  login: publicProcedure
    .input(z.object({
      username: z.string().min(1), // nome de usuário obrigatório
      password: z.string().min(1), // senha obrigatória
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Chama a função que verifica usuário e senha no banco e retorna um token JWT
        const result = await authenticateAdmin(input.username, input.password);

        // Obtém as configurações do cookie (segurança, domínio, etc.) com base na requisição
        const cookieOptions = getSessionCookieOptions(ctx.req);

        // Define o cookie "admin_token" na resposta HTTP para o navegador salvar
        // Esse cookie será enviado automaticamente em todas as próximas requisições
        ctx.res.setHeader('Set-Cookie', `admin_token=${result.token}; ${Object.entries(cookieOptions).map(([k, v]) => `${k}=${v}`).join('; ')}`);

        return result;
      } catch (error) {
        // Se as credenciais estiverem erradas, lança um erro 401 (não autorizado)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: error instanceof Error ? error.message : "Login failed",
        });
      }
    }),

  // ──────────────────────────────────────────────
  // LOGOUT
  // Remove o cookie de sessão do navegador, efetivamente deslogando o admin.
  // ──────────────────────────────────────────────
  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);

    // "maxAge: -1" força o navegador a apagar o cookie imediatamente
    ctx.res.clearCookie('admin_token', { ...cookieOptions, maxAge: -1 });

    return { success: true };
  }),

  // ──────────────────────────────────────────────
  // SOLICITAR RESET DE SENHA
  // O admin informa o e-mail e o sistema gera um token temporário para redefinição.
  // Em produção, esse token seria enviado por e-mail. Aqui só é salvo no banco.
  // ──────────────────────────────────────────────
  requestReset: publicProcedure
    .input(z.object({ email: z.string().email() })) // valida que o valor é um e-mail válido
    .mutation(async ({ input }) => {
      // Busca o admin pelo e-mail no banco de dados
      const admin = await db.getAdminByEmail(input.email);

      if (!admin) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Admin nao encontrado" });
      }

      // Gera um token aleatório de 32 bytes convertido para texto hexadecimal (64 caracteres)
      // Esse token seria enviado por e-mail para o admin clicar no link de reset
      const resetToken = crypto.randomBytes(32).toString("hex");

      // Define a expiração do token para 1 hora a partir de agora
      const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000);

      // Salva o token e a data de expiração no banco de dados
      await db.createPasswordReset(input.email, resetToken, expiresAt);

      return { success: true, message: "Link de reset enviado para seu e-mail" };
    }),

  // ──────────────────────────────────────────────
  // REDEFINIR SENHA
  // Recebe o token de reset e a nova senha, e atualiza a senha do admin no banco.
  // Atenção: atualmente está fixo no adminId = 1 (poderia ser melhorado buscando pelo token).
  // ──────────────────────────────────────────────
  resetPassword: publicProcedure
    .input(z.object({
      token: z.string(),          // token de reset gerado no passo anterior
      password: z.string().min(6), // nova senha com mínimo de 6 caracteres
    }))
    .mutation(async ({ input }) => {
      // Gera o hash da nova senha antes de salvar (nunca salvar senha em texto puro!)
      const hashedPassword = await hashPassword(input.password);

      // Atualiza a senha do admin no banco (fixado no id 1 por enquanto)
      await db.updateAdminPassword(1, hashedPassword);

      return { success: true, message: "Senha redefinida com sucesso" };
    }),

  // ──────────────────────────────────────────────
  // TROCAR SENHA (estando logado)
  // O admin informa a senha atual e a nova senha. Valida a atual antes de trocar.
  // ──────────────────────────────────────────────
  changePassword: adminLocalProcedure
    .input(z.object({
      currentPassword: z.string().min(6),
      newPassword: z.string().min(6),
    }))
    .mutation(async ({ input, ctx }) => {
      const admin = await db.getAdminById(ctx.adminId);

      if (!admin) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Admin nao encontrado" });
      }

      const isBcryptHash = admin.password.startsWith("$2b$") || admin.password.startsWith("$2a$");
      const isValid = isBcryptHash
        ? await verifyPassword(input.currentPassword, admin.password)
        : input.currentPassword === admin.password;

      if (!isValid) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Senha atual incorreta" });
      }

      const hashedPassword = await hashPassword(input.newPassword);
      await db.updateAdminPassword(ctx.adminId, hashedPassword);

      return { success: true, message: "Senha alterada com sucesso" };
    }),

  // ──────────────────────────────────────────────
  // ATUALIZAR LABEL CUSTOMIZADO
  // Permite ao admin definir um apelido/rótulo personalizado para sua conta.
  // ──────────────────────────────────────────────
  updateCustomLabel: adminLocalProcedure
    .input(z.object({
      customLabel: z.string().min(1).max(255),
    }))
    .mutation(async ({ input, ctx }) => {
      await db.updateAdminCustomLabel(ctx.adminId, input.customLabel);
      return { success: true, message: "Label customizado atualizado com sucesso" };
    }),
});
