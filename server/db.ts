import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, reports, InsertReport, invites, InsertInvite, Invite, admins, InsertAdmin, Admin } from "../drizzle/schema";
import { ENV } from './_core/env';
import crypto from "crypto";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Report queries
export async function createReport(report: InsertReport) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(reports).values(report);
  return result;
}

export async function getReportsByUserId(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.select().from(reports).where(eq(reports.userId, userId)).orderBy(desc(reports.createdAt));
}

export async function getReportById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.select().from(reports).where(eq(reports.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateReport(id: number, data: Partial<InsertReport>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(reports).set(data).where(eq(reports.id, id));
}

export async function deleteReport(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(reports).where(eq(reports.id, id));
}

// Invite queries
export async function createInvite(invite: InsertInvite) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(invites).values(invite);
  return result;
}

export async function getInvites() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.select().from(invites).orderBy(desc(invites.createdAt));
}

export async function getInviteByCode(code: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.select().from(invites).where(eq(invites.code, code)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function deleteInvite(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(invites).where(eq(invites.id, id));
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.select().from(users).orderBy(desc(users.createdAt));
}

export async function deleteUser(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(users).where(eq(users.id, id));
}

export async function updateUserRole(id: number, role: "user" | "admin") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(users).set({ role }).where(eq(users.id, id));
}


// Admin queries
export async function createAdmin(admin: InsertAdmin) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(admins).values(admin);
  return result;
}

export async function getAdminByEmail(email: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.select().from(admins).where(eq(admins.email, email)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getAdminById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.select().from(admins).where(eq(admins.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getAllAdmins() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.select().from(admins).orderBy(desc(admins.createdAt));
}

export async function updateAdminLastLogin(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(admins).set({ lastLogin: new Date() }).where(eq(admins.id, id));
}

export async function updateAdminPassword(id: number, password: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(admins).set({ password }).where(eq(admins.id, id));
}

export async function deleteAdmin(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(admins).where(eq(admins.id, id));
}


// Accept invite and create admin
export async function acceptInvite(code: string, name: string, password: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const invite = await getInviteByCode(code);
  if (!invite) throw new Error("Invite not found");
  
  if (new Date() > invite.expiresAt) {
    throw new Error("Invite expired");
  }

  // Create admin
  const result = await db.insert(admins).values({
    email: invite.email,
    password,
    name,
    active: 1,
  });

  // Delete invite
  await deleteInvite(invite.id);

  return result;
}

// Password reset
export async function createPasswordReset(email: string, token: string, expiresAt: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // For now, we'll store this in a simple way
  // In production, you'd want a dedicated password_resets table
  console.log(`Password reset token created for ${email}: ${token}`);
  return { success: true, token };
}



export async function getReportStats() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const allReports = await db.select().from(reports);
  const totalReports = allReports.length;
  
  // Group by service type
  const serviceStats = allReports.reduce((acc: Record<string, number>, report) => {
    acc[report.serviceType] = (acc[report.serviceType] || 0) + 1;
    return acc;
  }, {});

  // Group by month
  const monthlyStats = allReports.reduce((acc: Record<string, number>, report) => {
    const month = new Date(report.createdAt).toISOString().slice(0, 7);
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {});

  return {
    totalReports,
    serviceStats,
    monthlyStats,
    recentReports: allReports.slice(-5).reverse(),
  };
}

export async function createUser(userData: {
  email: string;
  password: string;
  role: "user" | "admin";
  setupToken?: string;
  setupTokenExpires?: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if user already exists
  const existing = await db.select().from(users).where(eq(users.email, userData.email)).limit(1);
  if (existing.length > 0) {
    throw new Error("User with this email already exists");
  }
  
  const result = await db.insert(users).values({
    email: userData.email,
    role: userData.role,
    name: userData.email.split("@")[0],
    loginMethod: "manual",
    openId: `manual-${crypto.randomBytes(16).toString("hex")}`,
  });
  
  return result;
}
