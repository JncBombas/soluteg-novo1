import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
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

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

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

  return {
    req: opts.req,
    res: opts.res,
    user,
    adminId,
    clientId,
    technicianId,
  };
}
