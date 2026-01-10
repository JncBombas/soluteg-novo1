import { eq, and, desc } from "drizzle-orm";
import { getDb } from "./db";
import {
  workOrderTasks,
  workOrderMaterials,
  workOrderAttachments,
  workOrderComments,
  workOrderTimeTracking,
  InsertWorkOrderTask,
  InsertWorkOrderMaterial,
  InsertWorkOrderAttachment,
  InsertWorkOrderComment,
  InsertWorkOrderTimeTracking,
} from "../drizzle/schema";

// ==================== TASKS ====================

export async function createTask(task: InsertWorkOrderTask) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(workOrderTasks).values(task);
  return result;
}

export async function getTasksByWorkOrderId(workOrderId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(workOrderTasks)
    .where(eq(workOrderTasks.workOrderId, workOrderId))
    .orderBy(workOrderTasks.orderIndex);
}

export async function updateTask(id: number, updates: Partial<InsertWorkOrderTask>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(workOrderTasks).set(updates).where(eq(workOrderTasks.id, id));
}

export async function deleteTask(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(workOrderTasks).where(eq(workOrderTasks.id, id));
}

export async function toggleTaskCompletion(id: number, isCompleted: boolean, completedBy?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(workOrderTasks).set({
    isCompleted: isCompleted ? 1 : 0,
    completedAt: isCompleted ? new Date() : null,
    completedBy: isCompleted ? completedBy : null,
  }).where(eq(workOrderTasks.id, id));
}

// ==================== MATERIALS ====================

export async function createMaterial(material: InsertWorkOrderMaterial) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(workOrderMaterials).values(material);
  return result;
}

export async function getMaterialsByWorkOrderId(workOrderId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(workOrderMaterials)
    .where(eq(workOrderMaterials.workOrderId, workOrderId))
    .orderBy(desc(workOrderMaterials.addedAt));
}

export async function updateMaterial(id: number, updates: Partial<InsertWorkOrderMaterial>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(workOrderMaterials).set(updates).where(eq(workOrderMaterials.id, id));
}

export async function deleteMaterial(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(workOrderMaterials).where(eq(workOrderMaterials.id, id));
}

export async function getTotalMaterialsCost(workOrderId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const materials = await getMaterialsByWorkOrderId(workOrderId);
  return materials.reduce((sum, m) => sum + (m.totalCost || 0), 0);
}

// ==================== ATTACHMENTS ====================

export async function createAttachment(attachment: InsertWorkOrderAttachment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(workOrderAttachments).values(attachment);
  return result;
}

export async function getAttachmentsByWorkOrderId(workOrderId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(workOrderAttachments)
    .where(eq(workOrderAttachments.workOrderId, workOrderId))
    .orderBy(desc(workOrderAttachments.uploadedAt));
}

export async function getAttachmentsByCategory(workOrderId: number, category: string) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(workOrderAttachments)
    .where(
      and(
        eq(workOrderAttachments.workOrderId, workOrderId),
        eq(workOrderAttachments.category, category as any)
      )
    )
    .orderBy(desc(workOrderAttachments.uploadedAt));
}

export async function deleteAttachment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(workOrderAttachments).where(eq(workOrderAttachments.id, id));
}

// ==================== COMMENTS ====================

export async function createComment(comment: InsertWorkOrderComment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(workOrderComments).values(comment);
  return result;
}

export async function getCommentsByWorkOrderId(workOrderId: number, includeInternal: boolean = true) {
  const db = await getDb();
  if (!db) return [];
  
  if (includeInternal) {
    return await db
      .select()
      .from(workOrderComments)
      .where(eq(workOrderComments.workOrderId, workOrderId))
      .orderBy(desc(workOrderComments.createdAt));
  } else {
    return await db
      .select()
      .from(workOrderComments)
      .where(
        and(
          eq(workOrderComments.workOrderId, workOrderId),
          eq(workOrderComments.isInternal, 0)
        )
      )
      .orderBy(desc(workOrderComments.createdAt));
  }
}

export async function deleteComment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(workOrderComments).where(eq(workOrderComments.id, id));
}

// ==================== TIME TRACKING ====================

export async function createTimeEntry(entry: InsertWorkOrderTimeTracking) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(workOrderTimeTracking).values(entry);
  return result;
}

export async function getTimeEntriesByWorkOrderId(workOrderId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(workOrderTimeTracking)
    .where(eq(workOrderTimeTracking.workOrderId, workOrderId))
    .orderBy(desc(workOrderTimeTracking.startedAt));
}

export async function updateTimeEntry(id: number, updates: Partial<InsertWorkOrderTimeTracking>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(workOrderTimeTracking).set(updates).where(eq(workOrderTimeTracking.id, id));
}

export async function endTimeEntry(id: number, endedAt: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Buscar a entrada para calcular duração
  const entries = await db
    .select()
    .from(workOrderTimeTracking)
    .where(eq(workOrderTimeTracking.id, id))
    .limit(1);
  
  if (entries.length === 0) return;
  
  const entry = entries[0];
  const durationMinutes = Math.floor(
    (endedAt.getTime() - new Date(entry.startedAt).getTime()) / 1000 / 60
  );
  
  await db.update(workOrderTimeTracking).set({
    endedAt,
    durationMinutes,
  }).where(eq(workOrderTimeTracking.id, id));
}

export async function getTotalTimeSpent(workOrderId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const entries = await getTimeEntriesByWorkOrderId(workOrderId);
  return entries.reduce((sum, e) => sum + (e.durationMinutes || 0), 0);
}

export async function deleteTimeEntry(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(workOrderTimeTracking).where(eq(workOrderTimeTracking.id, id));
}
