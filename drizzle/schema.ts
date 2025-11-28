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
  code: varchar("code", { length: 255 }).notNull().unique(),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  used: int("used").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
});

export type Invite = typeof invites.$inferSelect;
export type InsertInvite = typeof invites.$inferInsert;

/**
 * Administradores do sistema com autenticação por e-mail e senha
 */
export const admins = mysqlTable("admins", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  profilePhoto: text("profilePhoto"),
  customLabel: text("customLabel"),
  active: int("active").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastLogin: timestamp("lastLogin"),
});

export type Admin = typeof admins.$inferSelect;
export type InsertAdmin = typeof admins.$inferInsert;

/**
 * Relatórios de inspeção de bombas
 */
export const inspectionReports = mysqlTable("inspectionReports", {
  id: int("id").autoincrement().primaryKey(),
  adminId: int("adminId").notNull(),
  clientName: varchar("clientName", { length: 255 }).notNull(),
  clientAddress: text("clientAddress").notNull(),
  inspectionDate: timestamp("inspectionDate").notNull(),
  
  // Bomba de recalque
  recalqueTubulacao: varchar("recalqueTubulacao", { length: 50 }),
  recalqueAcionamento: varchar("recalqueAcionamento", { length: 50 }),
  recalqueBoias: varchar("recalqueBoias", { length: 50 }),
  recalqueLimpezaPainel: varchar("recalqueLimpezaPainel", { length: 50 }),
  recalqueLimpezaSala: varchar("recalqueLimpezaSala", { length: 50 }),
  recalqueTensaoPainel: varchar("recalqueTensaoPainel", { length: 50 }),
  recalqueCorrenteR: varchar("recalqueCorrenteR", { length: 50 }),
  recalqueCorrenteS: varchar("recalqueCorrenteS", { length: 50 }),
  recalqueCorrenteT: varchar("recalqueCorrenteT", { length: 50 }),
  recalqueRuido: varchar("recalqueRuido", { length: 50 }),
  
  // Bomba de dreno
  drenoTubulacao: varchar("drenoTubulacao", { length: 50 }),
  drenoAcionamento: varchar("drenoAcionamento", { length: 50 }),
  drenoBoias: varchar("drenoBoias", { length: 50 }),
  drenoLimpezaPainel: varchar("drenoLimpezaPainel", { length: 50 }),
  drenoTensaoPainel: varchar("drenoTensaoPainel", { length: 50 }),
  drenoCorrenteL1: varchar("drenoCorrenteL1", { length: 50 }),
  drenoCorrenteL2: varchar("drenoCorrenteL2", { length: 50 }),
  drenoRuido: varchar("drenoRuido", { length: 50 }),
  
  // Bomba piscina
  piscinaTubulacao: varchar("piscinaTubulacao", { length: 50 }),
  piscinaAcionamento: varchar("piscinaAcionamento", { length: 50 }),
  piscinaBoias: varchar("piscinaBoias", { length: 50 }),
  piscinaLimpezaPainel: varchar("piscinaLimpezaPainel", { length: 50 }),
  piscinaTensaoPainel: varchar("piscinaTensaoPainel", { length: 50 }),
  piscinaCorrenteR: varchar("piscinaCorrenteR", { length: 50 }),
  piscinaCorrenteS: varchar("piscinaCorrenteS", { length: 50 }),
  piscinaCorrenteT: varchar("piscinaCorrenteT", { length: 50 }),
  
  // Bomba incêndio B1
  incendioB1Tubulacao: varchar("incendioB1Tubulacao", { length: 50 }),
  incendioB1Acionamento: varchar("incendioB1Acionamento", { length: 50 }),
  incendioB1LimpezaSala: varchar("incendioB1LimpezaSala", { length: 50 }),
  incendioB1LimpezaPainel: varchar("incendioB1LimpezaPainel", { length: 50 }),
  incendioB1TensaoPainel: varchar("incendioB1TensaoPainel", { length: 50 }),
  incendioB1Corrente: varchar("incendioB1Corrente", { length: 50 }),
  incendioB1Ruido: varchar("incendioB1Ruido", { length: 50 }),
  
  // Bomba incêndio B2
  incendioB2Tubulacao: varchar("incendioB2Tubulacao", { length: 50 }),
  incendioB2Acionamento: varchar("incendioB2Acionamento", { length: 50 }),
  incendioB2LimpezaSala: varchar("incendioB2LimpezaSala", { length: 50 }),
  incendioB2LimpezaPainel: varchar("incendioB2LimpezaPainel", { length: 50 }),
  incendioB2TensaoPainel: varchar("incendioB2TensaoPainel", { length: 50 }),
  incendioB2Corrente: varchar("incendioB2Corrente", { length: 50 }),
  incendioB2Ruido: varchar("incendioB2Ruido", { length: 50 }),
  
  // Observações e assinaturas
  observations: text("observations"),
  technicianSignature: text("technicianSignature"), // URL da imagem da assinatura
  clientSignature: text("clientSignature"), // URL da imagem da assinatura
  photos: text("photos"), // JSON array com URLs das fotos
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type InspectionReport = typeof inspectionReports.$inferSelect;
export type InsertInspectionReport = typeof inspectionReports.$inferInsert;

/**
 * Clientes do portal - cada cliente tem login/senha próprio
 */
export const clients = mysqlTable("clients", {
  id: int("id").autoincrement().primaryKey(),
  adminId: int("adminId").notNull(), // Admin que criou o cliente
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  username: varchar("username", { length: 100 }).notNull().unique(), // Login do cliente
  password: varchar("password", { length: 255 }).notNull(), // Senha criptografada
  cnpjCpf: varchar("cnpjCpf", { length: 20 }),
  phone: varchar("phone", { length: 20 }),
  address: text("address"),
  active: int("active").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastLogin: timestamp("lastLogin"),
});

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

/**
 * Documentos dos clientes (relatórios, notas fiscais, etc)
 */
export const clientDocuments = mysqlTable("clientDocuments", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),
  adminId: int("adminId").notNull(), // Admin que fez upload
  title: varchar("title", { length: 255 }).notNull(), // Nome do documento
  description: text("description"), // Descrição opcional
  documentType: mysqlEnum("documentType", ["relatorio_servico", "relatorio_visita", "nota_fiscal", "outro"]).notNull(),
  fileUrl: text("fileUrl").notNull(), // URL do arquivo no S3
  fileKey: text("fileKey").notNull(), // Chave do arquivo no S3
  fileSize: int("fileSize"), // Tamanho em bytes
  mimeType: varchar("mimeType", { length: 50 }),
  uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ClientDocument = typeof clientDocuments.$inferSelect;
export type InsertClientDocument = typeof clientDocuments.$inferInsert;

/**
 * Ordens de Serviço (OS)
 */
export const workOrders = mysqlTable("workOrders", {
  id: int("id").autoincrement().primaryKey(),
  adminId: int("adminId").notNull(), // Admin que criou a OS
  clientId: int("clientId").notNull(), // Cliente relacionado
  osNumber: varchar("osNumber", { length: 50 }).notNull().unique(), // Número da OS (ex: OS-2025-001)
  title: varchar("title", { length: 255 }).notNull(), // Título/Descrição breve
  description: text("description"), // Descrição detalhada do serviço
  serviceType: varchar("serviceType", { length: 100 }), // Tipo de serviço (manutenção, reparo, etc)
  status: mysqlEnum("status", ["aberta", "em_andamento", "concluida", "cancelada"]).default("aberta").notNull(),
  priority: mysqlEnum("priority", ["baixa", "media", "alta"]).default("media").notNull(),
  scheduledDate: timestamp("scheduledDate"), // Data agendada
  completedDate: timestamp("completedDate"), // Data de conclusão
  estimatedHours: int("estimatedHours"), // Horas estimadas
  actualHours: int("actualHours"), // Horas reais gastas
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WorkOrder = typeof workOrders.$inferSelect;
export type InsertWorkOrder = typeof workOrders.$inferInsert;
