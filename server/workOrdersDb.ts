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

  const osNumber = await generateOsNumber();
  
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

  return { id: newOs[0]?.id || 0, osNumber };
}

/**
 * Buscar OS por ID
 */
export async function getWorkOrderById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(workOrders)
    .where(eq(workOrders.id, id))
    .limit(1);

  return result[0] || null;
}

/**
 * Listar OS com filtros
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

  let query = db.select().from(workOrders);

  const conditions = [];
  if (filters.clientId) conditions.push(eq(workOrders.clientId, filters.clientId));
  if (filters.adminId) conditions.push(eq(workOrders.adminId, filters.adminId));
  if (filters.type) conditions.push(eq(workOrders.type, filters.type as any));
  if (filters.status) conditions.push(eq(workOrders.status, filters.status as any));
  if (filters.startDate) conditions.push(gte(workOrders.createdAt, filters.startDate));
  if (filters.endDate) conditions.push(lte(workOrders.createdAt, filters.endDate));

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  const result = await query.orderBy(desc(workOrders.createdAt));
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
