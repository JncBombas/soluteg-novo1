import { eq, desc, and, gte, lte, like, sql } from "drizzle-orm";
import { getDb } from "./db";
import { workOrders, workOrderHistory, InsertWorkOrder, InsertWorkOrderHistory } from "../drizzle/schema";

/**
 * Gerar número de OS único (formato: OS-YYYY-NNNN)
 */
export async function generateOsNumber(): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const year = new Date().getFullYear();
  const prefix = `OS-${year}-`;

  // Buscar todas as OS do ano atual para encontrar o maior número
  const osThisYear = await db
    .select({ osNumber: workOrders.osNumber })
    .from(workOrders)
    .where(like(workOrders.osNumber, `${prefix}%`));

  let maxNumber = 0;
  for (const os of osThisYear) {
    if (os.osNumber) {
      const parts = os.osNumber.split("-");
      if (parts.length >= 3) {
        const num = parseInt(parts[2] || "0");
        if (num > maxNumber) maxNumber = num;
      }
    }
  }

  const nextNumber = maxNumber + 1;
  return `${prefix}${String(nextNumber).padStart(4, "0")}`;
}

/**
 * Criar nova OS
 */
export async function createWorkOrder(data: Omit<InsertWorkOrder, "osNumber">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  console.log("[workOrdersDb] Iniciando criação de OS com dados:", JSON.stringify(data));

  const osNumber = await generateOsNumber();
  console.log("[workOrdersDb] Número de OS gerado:", osNumber);
  
  try {
    const result = await db.insert(workOrders).values({
      ...data,
      osNumber,
    });

    // Buscar a OS recém-criada para retornar o ID
    const newOs = await db
      .select()
      .from(workOrders)
      .where(eq(workOrders.osNumber, osNumber))
      .limit(1);

    console.log("[workOrdersDb] OS criada com sucesso. ID:", newOs[0]?.id);
    return { id: newOs[0]?.id || 0, osNumber };
  } catch (error) {
    console.error("[workOrdersDb] Erro ao inserir OS no banco:", error);
    throw error;
  }
}

/**
 * Buscar OS por ID com dados do cliente
 */
export async function getWorkOrderById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const { clients } = await import("../drizzle/schema");
  
  const result = await db
    .select({
      // Campos da OS
      id: workOrders.id,
      osNumber: workOrders.osNumber,
      adminId: workOrders.adminId,
      clientId: workOrders.clientId,
      type: workOrders.type,
      status: workOrders.status,
      priority: workOrders.priority,
      title: workOrders.title,
      description: workOrders.description,
      serviceType: workOrders.serviceType,
      scheduledDate: workOrders.scheduledDate,
      startedAt: workOrders.startedAt,
      completedAt: workOrders.completedAt,
      estimatedHours: workOrders.estimatedHours,
      actualHours: workOrders.actualHours,
      estimatedValue: workOrders.estimatedValue,
      finalValue: workOrders.finalValue,
      internalNotes: workOrders.internalNotes,
      clientNotes: workOrders.clientNotes,
      cancellationReason: workOrders.cancellationReason,
      isRecurring: workOrders.isRecurring,
      recurrenceType: workOrders.recurrenceType,
      recurrenceDay: workOrders.recurrenceDay,
      createdAt: workOrders.createdAt,
      updatedAt: workOrders.updatedAt,
      collaboratorSignature: workOrders.collaboratorSignature,
      collaboratorName: workOrders.collaboratorName,
      clientSignature: workOrders.clientSignature,
      // Dados do cliente
      clientName: clients.name,
      clientAddress: clients.address,
      clientPhone: clients.phone,
      clientEmail: clients.email,
    })
    .from(workOrders)
    .leftJoin(clients, eq(workOrders.clientId, clients.id))
    .where(eq(workOrders.id, id))
    .limit(1);

  return result[0] || null;
}

/**
 * Listar OS com filtros
 */
/**
 * Listar OS com filtros (Versão Corrigida)
 */
export async function listWorkOrders(filters: {
  clientId?: number;
  adminId?: number;
  type?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  const db = await getDb();
  if (!db) return [];

  // Importamos o schema de clientes para garantir o Join
  const { clients } = await import("../drizzle/schema");

  // Mudamos de .select() para uma seleção explícita para evitar que campos novos 
  // (como o documento) quebrem a listagem se estiverem nulos
  let query = db
    .select({
      id: workOrders.id,
      osNumber: workOrders.osNumber,
      title: workOrders.title,
      status: workOrders.status,
      type: workOrders.type,
      priority: workOrders.priority,
      createdAt: workOrders.createdAt,
      scheduledDate: workOrders.scheduledDate,
      isRecurring: workOrders.isRecurring,
      estimatedValue: workOrders.estimatedValue,
      clientId: workOrders.clientId,
      clientName: clients.name, // Isso ajuda a mostrar o nome do cliente na lista
    })
    .from(workOrders)
    .leftJoin(clients, eq(workOrders.clientId, clients.id));

  const conditions = [];
  if (filters.clientId) conditions.push(eq(workOrders.clientId, filters.clientId));
  if (filters.adminId) conditions.push(eq(workOrders.adminId, filters.adminId));
  if (filters.type) conditions.push(eq(workOrders.type, filters.type as any));
  if (filters.status) conditions.push(eq(workOrders.status, filters.status as any));
  
  // Filtros de data costumam causar sumiço se os fusos horários estiverem errados
  if (filters.startDate) conditions.push(gte(workOrders.createdAt, filters.startDate));
  if (filters.endDate) conditions.push(lte(workOrders.createdAt, filters.endDate));

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  console.log(`[workOrdersDb] Executando listWorkOrders com filtros:`, JSON.stringify(filters));

  // Ordenar sempre pela mais recente
  const result = await query.orderBy(desc(workOrders.createdAt));
  
  console.log(`[workOrdersDb] Retornando ${result.length} resultados`);
  return result;
}
/**
 * Atualizar OS
 */
export async function updateWorkOrder(id: number, data: Partial<InsertWorkOrder>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(workOrders)
    .set(data)
    .where(eq(workOrders.id, id));

  return true;
}

/**
 * Deletar OS
 */
export async function deleteWorkOrder(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(workOrders).where(eq(workOrders.id, id));
  return true;
}

/**
 * Adicionar entrada no histórico de mudanças
 */
export async function addWorkOrderHistory(data: Omit<InsertWorkOrderHistory, "createdAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(workOrderHistory).values(data);
  return true;
}

/**
 * Buscar histórico de uma OS
 */
export async function getWorkOrderHistory(workOrderId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select()
    .from(workOrderHistory)
    .where(eq(workOrderHistory.workOrderId, workOrderId))
    .orderBy(desc(workOrderHistory.createdAt));

  return result;
}

/**
 * Atualizar status da OS e registrar no histórico
 */
export async function updateWorkOrderStatus(
  id: number,
  newStatus: string,
  changedBy: string,
  changedByType: "admin" | "client",
  notes?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Buscar status atual
  const currentOs = await getWorkOrderById(id);
  if (!currentOs) throw new Error("OS not found");

  // Atualizar status
  await updateWorkOrder(id, { status: newStatus as any });

  // Registrar no histórico
  await addWorkOrderHistory({
    workOrderId: id,
    changedBy,
    changedByType,
    previousStatus: currentOs.status,
    newStatus,
    notes,
  });

  return true;
}

/**
 * Buscar OS recorrentes que precisam ser criadas
 */
export async function getRecurringWorkOrders() {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select()
    .from(workOrders)
    .where(
      and(
        eq(workOrders.isRecurring, 1),
        eq(workOrders.recurrenceCanceled, 0)
      )
    );

  return result;
}
