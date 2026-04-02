import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { verifyToken } from "../adminAuth";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  adminId: number | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  let adminId: number | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  try {
    const cookieHeader = opts.req.headers.cookie || "";
    const cookies = Object.fromEntries(
      cookieHeader.split(";").map(c => {
        const idx = c.indexOf("=");
        return [c.slice(0, idx).trim(), c.slice(idx + 1).trim()];
      })
    );
    const adminToken = cookies["admin_token"];
    if (adminToken) {
      const payload = verifyToken(adminToken);
      adminId = payload?.adminId ?? null;
    }
  } catch {
    adminId = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    adminId,
  };
}
