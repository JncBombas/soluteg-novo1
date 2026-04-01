import { mysqlTable, int, varchar, text, tinyint, datetime, mysqlEnum, timestamp } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
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
  username: varchar("username", { length: 100 }).notNull().unique(),
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
  email: varchar("email", { length: 320 }),
  username: varchar("username", { length: 100 }).notNull().unique(), // Login do cliente
  password: varchar("password", { length: 255 }).notNull(), // Senha criptografada
  cnpjCpf: varchar("cnpjCpf", { length: 20 }),
   syndicName: varchar("syndic_name", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  address: text("address"),
  profilePhoto: varchar("profilePhoto", { length: 500 }),
  type: mysqlEnum("type", ["com_portal", "sem_portal"]).default("com_portal").notNull(), // com_portal: acesso ao painel | sem_portal: apenas cadastro
  active: int("active").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastLogin: timestamp("lastLogin"),
});

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

/**
 * Técnicos do sistema - cada técnico tem login/senha próprio para o portal
 */
export const technicians = mysqlTable("technicians", {
  id:             int("id").autoincrement().primaryKey(),
  adminId:        int("adminId").notNull(),
  name:           varchar("name", { length: 255 }).notNull(),
  email:          varchar("email", { length: 320 }),
  username:       varchar("username", { length: 100 }).notNull().unique(),
  password:       varchar("password", { length: 255 }).notNull(),
  cpf:            varchar("cpf", { length: 20 }),
  phone:          varchar("phone", { length: 20 }),
  specialization: varchar("specialization", { length: 150 }),
  active:         int("active").default(1).notNull(),
  createdAt:      timestamp("createdAt").defaultNow().notNull(),
  updatedAt:      timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastLogin:      timestamp("lastLogin"),
});

export type Technician = typeof technicians.$inferSelect;
export type InsertTechnician = typeof technicians.$inferInsert;

/**
 * Documentos dos clientes (relatórios, notas fiscais, etc)
 */
export const clientDocuments = mysqlTable("clientDocuments", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),
  adminId: int("adminId").notNull(), // Admin que fez upload
  title: varchar("title", { length: 255 }).notNull(), // Nome do documento
  description: text("description"), // Descrição opcional
  documentType: mysqlEnum("documentType", ["vistoria", "visita", "nota_fiscal", "servico", "relatorio_servico", "relatorio_visita"]).notNull(),
  fileUrl: text("fileUrl").notNull(), // URL do arquivo no S3
  fileKey: text("fileKey").notNull(), // Chave do arquivo no S3
  fileSize: int("fileSize"), // Tamanho em bytes
  mimeType: varchar("mimeType", { length: 50 }),
  month: int("month"), // Mês de referência (1-12)
  year: int("year"),   // Ano de referência
  uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ClientDocument = typeof clientDocuments.$inferSelect;
export type InsertClientDocument = typeof clientDocuments.$inferInsert;

/**
 * Ordens de Serviço (OS) - Sistema completo
 */
export const workOrders = mysqlTable("workOrders", {
  id: int("id").autoincrement().primaryKey(),
  adminId: int("adminId").notNull(),
  clientId: int("clientId").notNull(),
  osNumber: varchar("osNumber", { length: 50 }).notNull().unique(),
  
  // Tipo e categoria
  type: mysqlEnum("type", ["rotina", "emergencial", "instalacao", "manutencao", "corretiva", "preventiva"]).notNull(),
  priority: mysqlEnum("priority", ["normal", "alta", "critica"]).default("normal").notNull(),
  
  // Informações básicas
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  serviceType: varchar("serviceType", { length: 100 }),
  
  // Status (varia por tipo)
  status: mysqlEnum("status", [
    "aberta",
    "aguardando_aprovacao",
    "aprovada",
    "rejeitada",
    "em_andamento",
    "concluida",
    "aguardando_pagamento",
    "cancelada"
  ]).default("aberta").notNull(),
  
  // Datas e tempo
  scheduledDate: timestamp("scheduledDate"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  estimatedHours: int("estimatedHours"),
  actualHours: int("actualHours"),
  
  // Orçamento
  estimatedValue: int("estimatedValue"),
  finalValue: int("finalValue"),
  approvedBy: varchar("approvedBy", { length: 100 }),
  approvedAt: timestamp("approvedAt"),
  
  // Recorrência (para OS de rotina)
  isRecurring: int("isRecurring").default(0).notNull(),
  recurrenceType: mysqlEnum("recurrenceType", ["mensal_fixo", "mensal_inicio"]),
  recurrenceDay: int("recurrenceDay"),
  recurrenceCanceled: int("recurrenceCanceled").default(0).notNull(),
  parentOsId: int("parentOsId"),
  
  // Observações e anexos
  internalNotes: text("internalNotes"),
  clientNotes: text("clientNotes"),
  cancellationReason: text("cancellationReason"),
  attachments: text("attachments"),
  
  // Assinaturas digitais
  collaboratorSignature: text("collaboratorSignature"),
  collaboratorName: varchar("collaboratorName", { length: 255 }),
  collaboratorDocument: varchar("collaboratorDocument", { length: 20 }),
  clientSignature: text("clientSignature"),
  clientName: varchar("clientName", { length: 255 }),
  signedAt: timestamp("signedAt"),
  
  // Técnico responsável
  technicianId: int("technicianId"),

  // Portal do Cliente
  sharedWithPortal: int("sharedWithPortal").default(0).notNull(),
  portalTab: varchar("portalTab", { length: 50 }),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WorkOrder = typeof workOrders.$inferSelect;
export type InsertWorkOrder = typeof workOrders.$inferInsert;

/**
 * Histórico de mudanças de status das OS
 */
export const workOrderHistory = mysqlTable("workOrderHistory", {
  id: int("id").autoincrement().primaryKey(),
  workOrderId: int("workOrderId").notNull(),
  changedBy: varchar("changedBy", { length: 100 }).notNull(),
  changedByType: mysqlEnum("changedByType", ["admin", "client", "technician"]).notNull(),
  previousStatus: varchar("previousStatus", { length: 50 }),
  newStatus: varchar("newStatus", { length: 50 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WorkOrderHistory = typeof workOrderHistory.$inferSelect;
export type InsertWorkOrderHistory = typeof workOrderHistory.$inferInsert;

/**
 * Tarefas/Checklist dentro de uma OS
 */
export const workOrderTasks = mysqlTable("workOrderTasks", {
  id: int("id").autoincrement().primaryKey(),
  workOrderId: int("workOrderId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  isCompleted: int("isCompleted").default(0).notNull(),
  completedAt: timestamp("completedAt"),
  completedBy: varchar("completedBy", { length: 100 }),
  orderIndex: int("orderIndex").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WorkOrderTask = typeof workOrderTasks.$inferSelect;
export type InsertWorkOrderTask = typeof workOrderTasks.$inferInsert;

/**
 * Materiais/Peças utilizadas em uma OS
 */
export const workOrderMaterials = mysqlTable("workOrderMaterials", {
  id: int("id").autoincrement().primaryKey(),
  workOrderId: int("workOrderId").notNull(),
  materialName: varchar("materialName", { length: 255 }).notNull(),
  quantity: int("quantity").notNull(),
  unit: varchar("unit", { length: 20 }), // Ex: unidade, metro, litro
  unitCost: int("unitCost"), // Em centavos
  totalCost: int("totalCost"), // Em centavos
  addedAt: timestamp("addedAt").defaultNow().notNull(),
  addedBy: varchar("addedBy", { length: 100 }),
});

export type WorkOrderMaterial = typeof workOrderMaterials.$inferSelect;
export type InsertWorkOrderMaterial = typeof workOrderMaterials.$inferInsert;

/**
 * Anexos (fotos, documentos) de uma OS
 */
export const workOrderAttachments = mysqlTable("workOrderAttachments", {
  id: int("id").autoincrement().primaryKey(),
  workOrderId: int("workOrderId").notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileKey: text("fileKey").notNull(), // Chave S3
  fileUrl: text("fileUrl").notNull(),
  fileType: varchar("fileType", { length: 100 }), // Ex: image/jpeg, application/pdf
  fileSize: int("fileSize"), // Em bytes
  category: mysqlEnum("category", ["before", "during", "after", "document", "other"]).default("other").notNull(),
  description: text("description"), // <--- Aqui é onde a legenda será salva!
  uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
  uploadedBy: varchar("uploadedBy", { length: 100 }),
});

export type WorkOrderAttachment = typeof workOrderAttachments.$inferSelect;
export type InsertWorkOrderAttachment = typeof workOrderAttachments.$inferInsert;

/**
 * Comentários/Timeline de uma OS
 */
export const workOrderComments = mysqlTable("workOrderComments", {
  id: int("id").autoincrement().primaryKey(),
  workOrderId: int("workOrderId").notNull(),
  userId: varchar("userId", { length: 100 }).notNull(),
  userType: mysqlEnum("userType", ["admin", "client"]).notNull(),
  comment: text("comment").notNull(),
  isInternal: int("isInternal").default(1).notNull(), // 1 = interno, 0 = visível ao cliente
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WorkOrderComment = typeof workOrderComments.$inferSelect;
export type InsertWorkOrderComment = typeof workOrderComments.$inferInsert;

/**
 * Rastreamento de tempo gasto em uma OS
 */
export const workOrderTimeTracking = mysqlTable("workOrderTimeTracking", {
  id: int("id").autoincrement().primaryKey(),
  workOrderId: int("workOrderId").notNull(),
  userId: varchar("userId", { length: 100 }).notNull(),
  startedAt: timestamp("startedAt").notNull(),
  endedAt: timestamp("endedAt"),
  durationMinutes: int("durationMinutes"), // Calculado automaticamente
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WorkOrderTimeTracking = typeof workOrderTimeTracking.$inferSelect;
export type InsertWorkOrderTimeTracking = typeof workOrderTimeTracking.$inferInsert;


/**
 * Templates de checklists genéricos (Bombas, Geradores, etc)
 */
export const checklistTemplates = mysqlTable("checklistTemplates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(), // Ex: "Bomba de Recalque", "Gerador"
  slug: varchar("slug", { length: 50 }).notNull().unique(), // Ex: "bomba_recalque", "gerador"
  description: text("description"),
  // JSON com a estrutura do formulário (itens, campos, etc)
  formStructure: text("formStructure").notNull(),
  active: int("active").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ChecklistTemplate = typeof checklistTemplates.$inferSelect;
export type InsertChecklistTemplate = typeof checklistTemplates.$inferInsert;

/**
 * Tarefas de inspeção (agrupam múltiplos checklists)
 */
export const inspectionTasks = mysqlTable("inspectionTasks", {
  id: int("id").autoincrement().primaryKey(),
  workOrderId: int("workOrderId").notNull(),
  title: varchar("title", { length: 255 }).notNull(), // Ex: "Inspeção Mensal"
  description: text("description"),
  status: mysqlEnum("status", ["pendente", "em_andamento", "concluida"]).default("pendente").notNull(),
  
  // Assinaturas de conclusão
  collaboratorSignature: text("collaboratorSignature"), // Base64 da assinatura
  collaboratorName: varchar("collaboratorName", { length: 255 }),
  collaboratorDocument: varchar("collaboratorDocument", { length: 20 }), // CPF ou RG
  clientSignature: text("clientSignature"), // Base64 da assinatura
  clientName: varchar("clientName", { length: 255 }),
  
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type InspectionTask = typeof inspectionTasks.$inferSelect;
export type InsertInspectionTask = typeof inspectionTasks.$inferInsert;

/**
 * Checklists preenchidos (instâncias de templates dentro de uma tarefa)
 */
export const checklistInstances = mysqlTable("checklistInstances", {
  id: int("id").autoincrement().primaryKey(),
  inspectionTaskId: int("inspectionTaskId").notNull(),
  templateId: int("templateId").notNull(),
  
  // Informações customizadas
  customTitle: varchar("customTitle", { length: 255 }).notNull(), // Ex: "Bomba de Recalque Bloco 1"
  brand: varchar("brand", { length: 100 }), // Marca
  power: varchar("power", { length: 50 }), // Potência
  
  // Respostas do formulário em JSON
  responses: text("responses"), // JSON com todas as respostas
  
  // Status
  isComplete: int("isComplete").default(0).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ChecklistInstance = typeof checklistInstances.$inferSelect;
export type InsertChecklistInstance = typeof checklistInstances.$inferInsert;

/**
 * Monitoramento de níveis de caixa d'água
 */
export const waterTankMonitoring = mysqlTable("waterTankMonitoring", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),
  adminId: int("adminId").notNull(),
  tankName: varchar("tankName", { length: 100 }).notNull(), // Nome da caixa (ex: Torre A, Reservatório Inferior)
  currentLevel: int("currentLevel").notNull(), // Nível atual em porcentagem (0-100)
  capacity: int("capacity"), // Capacidade total em litros (opcional)
  status: mysqlEnum("status", ["otimo", "bom", "alerta", "critico"]).default("otimo").notNull(),
  notes: text("notes"),
  measuredAt: timestamp("measuredAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WaterTankMonitoring = typeof waterTankMonitoring.$inferSelect;
export type InsertWaterTankMonitoring = typeof waterTankMonitoring.$inferInsert;

/**
 * Orçamentos - entidade separada das OS
 * Fluxo: pendente → finalizado → aprovado/reprovado
 * Se aprovado, gera uma OS de serviço
 */
export const budgets = mysqlTable("budgets", {
  id: int("id").autoincrement().primaryKey(),
  adminId: int("adminId").notNull(),
  clientId: int("clientId").notNull(),
  budgetNumber: varchar("budgetNumber", { length: 50 }).notNull().unique(), // ORC-YYYY-NNNN

  // Tipo de serviço — define o tipo de OS gerada se aprovado
  serviceType: mysqlEnum("serviceType", [
    "instalacao", "manutencao", "corretiva", "preventiva", "rotina", "emergencial"
  ]).notNull(),
  priority: mysqlEnum("priority", ["normal", "alta", "critica"]).default("normal").notNull(),

  // Informações básicas
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  scope: text("scope"), // Escopo detalhado dos serviços

  // Status com visão dupla (admin/cliente)
  // pendente = admin elaborando | cliente vê "Solicitado"
  // finalizado = admin finalizou | cliente vê "Pendente Aprovação"
  // aprovado = aprovado pelo cliente/admin
  // reprovado = reprovado
  status: mysqlEnum("status", ["pendente", "finalizado", "aprovado", "reprovado"]).default("pendente").notNull(),

  // Validade do orçamento
  validityDays: int("validityDays").default(30).notNull(), // dias de validade a partir da finalização
  validUntil: timestamp("validUntil"), // calculado ao finalizar

  // Valores
  laborValue: int("laborValue"), // Mão de obra (em centavos)
  totalValue: int("totalValue"), // Total calculado (materiais + mão de obra)

  // Assinatura do responsável técnico (ao finalizar)
  technicianSignature: text("technicianSignature"),
  technicianName: varchar("technicianName", { length: 255 }),
  technicianDocument: varchar("technicianDocument", { length: 20 }),
  finalizedAt: timestamp("finalizedAt"),

  // Assinatura do cliente (ao aprovar)
  clientSignature: text("clientSignature"),
  clientSignatureName: varchar("clientSignatureName", { length: 255 }),
  approvedAt: timestamp("approvedAt"),
  approvedBy: varchar("approvedBy", { length: 100 }), // nome ou "admin"

  // Token para aprovação via link público
  approvalToken: varchar("approvalToken", { length: 64 }).unique(),
  approvalTokenExpiresAt: timestamp("approvalTokenExpiresAt"),

  // Se aprovado, referência à OS gerada
  generatedOsId: int("generatedOsId"),

  // Revisão (histórico de edições pós-finalizado)
  version: int("version").default(1).notNull(),

  // Portal
  sharedWithPortal: int("sharedWithPortal").default(0).notNull(),

  // Notas
  internalNotes: text("internalNotes"),
  clientNotes: text("clientNotes"),
  rejectionReason: text("rejectionReason"),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Budget = typeof budgets.$inferSelect;
export type InsertBudget = typeof budgets.$inferInsert;

/**
 * Itens de linha do orçamento (materiais, serviços, etc)
 */
export const budgetItems = mysqlTable("budgetItems", {
  id: int("id").autoincrement().primaryKey(),
  budgetId: int("budgetId").notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  quantity: int("quantity").notNull().default(1), // em centésimos (ex: 150 = 1,50)
  unit: varchar("unit", { length: 30 }).default("un"), // un, m, m², h, kg, etc
  unitPrice: int("unitPrice").notNull().default(0), // em centavos
  totalPrice: int("totalPrice").notNull().default(0), // quantity * unitPrice / 100
  orderIndex: int("orderIndex").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BudgetItem = typeof budgetItems.$inferSelect;
export type InsertBudgetItem = typeof budgetItems.$inferInsert;

/**
 * Histórico de ações e mudanças no orçamento
 */
export const budgetHistory = mysqlTable("budgetHistory", {
  id: int("id").autoincrement().primaryKey(),
  budgetId: int("budgetId").notNull(),
  changedBy: varchar("changedBy", { length: 100 }).notNull(),
  changedByType: mysqlEnum("changedByType", ["admin", "client"]).notNull(),
  action: varchar("action", { length: 50 }).notNull(), // criado, editado, finalizado, aprovado, reprovado, revisao
  previousStatus: varchar("previousStatus", { length: 50 }),
  newStatus: varchar("newStatus", { length: 50 }),
  snapshotData: text("snapshotData"), // JSON com snapshot dos dados antes da edição
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BudgetHistory = typeof budgetHistory.$inferSelect;
export type InsertBudgetHistory = typeof budgetHistory.$inferInsert;
