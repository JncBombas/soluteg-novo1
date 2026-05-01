import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { verifyToken, verifyClientToken, verifyTechnicianToken } from "../adminAuth";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  adminId: number | null;
  clientId: number | null;
  technicianId: number | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  let adminId: number | null = null;
  let clientId: number | null = null;
  let technicianId: number | null = null;

  // SDK Manus removido — autenticação feita via JWT nos blocos abaixo
  const cookieHeader = opts.req.headers.cookie || "";
  const cookies = Object.fromEntries(
    cookieHeader.split(";").map(c => {
      const idx = c.indexOf("=");
      return [c.slice(0, idx).trim(), c.slice(idx + 1).trim()];
    })
  );

  try {
    const adminToken = cookies["admin_token"];
    if (adminToken) {
      const payload = verifyToken(adminToken);
      adminId = payload?.adminId ?? null;
    }
  } catch {
    adminId = null;
  }

  try {
    const clientToken = cookies["client_token"];
    if (clientToken) {
      const payload = verifyClientToken(clientToken);
      clientId = payload?.clientId ?? null;
    }
  } catch {
    clientId = null;
  }

  try {
    const technicianToken = cookies["technician_token"];
    if (technicianToken) {
      const payload = verifyTechnicianToken(technicianToken);
      technicianId = payload?.technicianId ?? null;
    }
  } catch {
    technicianId = null;
  }

  // ── Suporte a Bearer token para o app mobile ──────────────────
  // O app mobile não usa cookies HttpOnly; envia o JWT como
  // "Authorization: Bearer <token>" em vez disso.
  // Verificamos apenas se o id ainda não foi preenchido pelo cookie,
  // para não sobrescrever a autenticação web existente.
  const authHeader = opts.req.headers.authorization ?? "";
  const bearerToken = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (bearerToken) {
    if (!technicianId) {
      try {
        const payload = verifyTechnicianToken(bearerToken);
        if (payload?.technicianId) technicianId = payload.technicianId;
      } catch {
        // Token inválido ou de outro tipo — ignora silenciosamente
      }
    }
    if (!clientId) {
      try {
        const payload = verifyClientToken(bearerToken);
        if (payload?.clientId) clientId = payload.clientId;
      } catch {
        // Token inválido ou de outro tipo — ignora silenciosamente
      }
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    adminId,
    clientId,
    technicianId,
  };
}
