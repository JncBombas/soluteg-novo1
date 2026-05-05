/**
 * offlineDB.ts — banco de dados local (IndexedDB) para o modo offline.
 *
 * Versão 2: adiciona store "pendingMutations" para fila de escrita offline.
 *
 * Stores:
 *   "orders"           — OS completas (sumário + detalhe) do técnico (keyPath: id)
 *   "metadata"         — chave/valor genérico: lastSync, technicianId, etc.
 *   "pendingMutations" — mutations enfileiradas enquanto offline (keyPath: id, autoIncrement)
 */

import { openDB, IDBPDatabase } from "idb";

const DB_NAME    = "soluteg-offline";
const DB_VERSION = 2; // v1→v2: adiciona pendingMutations

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

/** Dados da OS armazenados localmente (sumário + campos opcionais de detalhe). */
export type OfflineOrder = {
  // Campos do sumário (sempre presentes)
  id: number;
  osNumber: string;
  title: string;
  status: string;
  priority: string;
  scheduledDate: string | null; // ISO string
  createdAt: string;            // ISO string
  clientName: string | null;
  description: string | null;
  serviceType: string | null;
  type: string;

  // Campos do detalhe — preenchidos quando o técnico abre a OS (opcionais)
  clientAddress?: string | null;
  clientPhone?: string | null;
  clientId?: number;
  technicianSignature?: string | null;
  technicianSignedAt?: string | null;
  clientSignature?: string | null;
  internalNotes?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  pausedAt?: string | null;
  updatedAt?: string;

  // Metadado interno
  _savedAt: number; // Date.now()
};

/** Tipos de mutation que podem ser enfileirados offline. */
export type MutationType =
  | "updateStatus"
  | "toggleTask"
  | "updateChecklistResponses"
  | "createComment"
  | "saveSignature";   // sub-fase 3.4

/** Entrada na fila de mutations offline. */
export type PendingMutation = {
  id?: number;          // autoIncrement — preenchido pelo IndexedDB
  type: MutationType;
  payload: Record<string, unknown>;
  /** JWT no momento da criação, não do envio (segurança). */
  jwtToken: string;
  createdAt: number;    // Date.now()
  retries: number;
  lastError: string | null;
  /** "pending" = aguardando envio; "error" = falhou após 3 tentativas. */
  status: "pending" | "error";
};

export type MetadataKey = "lastSync" | "technicianId";

// ---------------------------------------------------------------------------
// Singleton de conexão
// ---------------------------------------------------------------------------

let dbInstance: IDBPDatabase | null = null;

export async function openOfflineDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      // v1: stores originais
      if (oldVersion < 1) {
        db.createObjectStore("orders",   { keyPath: "id" });
        db.createObjectStore("metadata", { keyPath: "key" });
        console.log("[OFFLINE] Stores v1 criados no IndexedDB");
      }
      // v2: fila de mutations offline
      if (oldVersion < 2) {
        db.createObjectStore("pendingMutations", { keyPath: "id", autoIncrement: true });
        console.log("[OFFLINE] Store 'pendingMutations' criado no IndexedDB");
      }
    },
    blocked() {
      console.warn("[OFFLINE] IndexedDB bloqueado por outra aba.");
    },
    blocking() {
      dbInstance?.close();
      dbInstance = null;
    },
  });

  return dbInstance;
}

// ---------------------------------------------------------------------------
// CRUD — store "orders"
// ---------------------------------------------------------------------------

export async function saveOrder(order: OfflineOrder): Promise<void> {
  const db = await openOfflineDB();
  await db.put("orders", order);
}

/** Salva/mescla os campos de detalhe em uma OS já existente no cache. */
export async function saveOrderDetail(detail: Partial<OfflineOrder> & { id: number }): Promise<void> {
  const db   = await openOfflineDB();
  const prev = (await db.get("orders", detail.id)) ?? {};
  await db.put("orders", { ...prev, ...detail, _savedAt: Date.now() });
}

export async function getOrder(id: number): Promise<OfflineOrder | undefined> {
  const db = await openOfflineDB();
  return db.get("orders", id);
}

export async function getAllOrders(): Promise<OfflineOrder[]> {
  const db  = await openOfflineDB();
  const all = await db.getAll("orders");
  return all.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function deleteOrder(id: number): Promise<void> {
  const db = await openOfflineDB();
  await db.delete("orders", id);
}

export async function clearAllOrders(): Promise<void> {
  const db = await openOfflineDB();
  await db.clear("orders");
}

// ---------------------------------------------------------------------------
// CRUD — store "metadata"
// ---------------------------------------------------------------------------

export async function getMetadata(key: MetadataKey): Promise<number | undefined> {
  const db  = await openOfflineDB();
  const row = await db.get("metadata", key);
  return row?.value as number | undefined;
}

export async function setMetadata(key: MetadataKey, value: number): Promise<void> {
  const db = await openOfflineDB();
  await db.put("metadata", { key, value });
}

// ---------------------------------------------------------------------------
// CRUD — store "pendingMutations"
// ---------------------------------------------------------------------------

/** Adiciona uma mutation à fila. Retorna o id gerado. */
export async function addPendingMutation(
  mutation: Omit<PendingMutation, "id">
): Promise<number> {
  const db = await openOfflineDB();
  const id = await db.add("pendingMutations", mutation);
  return id as number;
}

/** Retorna todas as mutations com status "pending", em ordem de criação. */
export async function getPendingMutations(): Promise<PendingMutation[]> {
  const db  = await openOfflineDB();
  const all = (await db.getAll("pendingMutations")) as PendingMutation[];
  return all
    .filter(m => m.status === "pending")
    .sort((a, b) => a.createdAt - b.createdAt);
}

/** Retorna todas as mutations (pending + error) para exibição no modal. */
export async function getAllPendingMutations(): Promise<PendingMutation[]> {
  const db = await openOfflineDB();
  const all = (await db.getAll("pendingMutations")) as PendingMutation[];
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

/** Conta mutations com status "pending". */
export async function countPendingMutations(): Promise<number> {
  const db  = await openOfflineDB();
  const all = (await db.getAll("pendingMutations")) as PendingMutation[];
  return all.filter(m => m.status === "pending").length;
}

/** Atualiza uma mutation existente (ex: incrementar retries ou marcar como error). */
export async function updatePendingMutation(
  id: number,
  changes: Partial<PendingMutation>
): Promise<void> {
  const db   = await openOfflineDB();
  const prev = await db.get("pendingMutations", id);
  if (!prev) return;
  await db.put("pendingMutations", { ...prev, ...changes });
}

/** Remove uma mutation da fila (após sincronização bem-sucedida). */
export async function removePendingMutation(id: number): Promise<void> {
  const db = await openOfflineDB();
  await db.delete("pendingMutations", id);
}

/** Remove todas as mutations da fila (uso administrativo). */
export async function clearPendingMutations(): Promise<void> {
  const db = await openOfflineDB();
  await db.clear("pendingMutations");
}
