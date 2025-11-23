import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("reports procedures", () => {
  it("should create a report successfully", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const reportData = {
      title: "Test Report",
      clientName: "Test Client",
      serviceType: "manutencao-industrial",
      serviceDate: new Date("2024-01-15"),
      location: "Test Location",
      description: "Test description",
      workPerformed: "Test work performed",
      technicianName: "Test Technician",
      status: "draft" as const,
    };

    const result = await caller.reports.create(reportData);

    expect(result).toEqual({ success: true });
  });

  it("should list reports for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const reports = await caller.reports.list();

    expect(Array.isArray(reports)).toBe(true);
  });

  it("should reject report creation without required fields", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const invalidData = {
      title: "Test",
      // Missing required fields
    } as any;

    await expect(caller.reports.create(invalidData)).rejects.toThrow();
  });
});
