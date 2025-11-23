import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Relatórios técnicos criados pelos usuários
 */
export const reports = mysqlTable("reports", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  clientName: varchar("clientName", { length: 255 }).notNull(),
  serviceType: varchar("serviceType", { length: 100 }).notNull(),
  serviceDate: timestamp("serviceDate").notNull(),
  location: text("location").notNull(),
  description: text("description").notNull(),
  equipmentDetails: text("equipmentDetails"),
  workPerformed: text("workPerformed").notNull(),
  partsUsed: text("partsUsed"),
  technicianName: varchar("technicianName", { length: 255 }).notNull(),
  observations: text("observations"),
  status: mysqlEnum("status", ["draft", "completed", "reviewed"]).default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Report = typeof reports.$inferSelect;
export type InsertReport = typeof reports.$inferInsert;

/**
 * Convites para novos usuários (criados manualmente pelo admin)
 */
export const invites = mysqlTable("invites", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  code: varchar("code", { length: 64 }).notNull().unique(),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  used: timestamp("used"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
});

export type Invite = typeof invites.$inferSelect;
export type InsertInvite = typeof invites.$inferInsert;
