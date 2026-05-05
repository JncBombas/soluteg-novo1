/**
 * offlineDB.ts — banco de dados local (IndexedDB) para o modo offline.
 *
 * Stores:
 *   "orders"   — OS completas do técnico (keyPath: id)
 *   "metadata" — chave/valor genérico: última sync, technicianId, etc.
 *
 * Uso: chamar openOfflineDB() para obter a instância do banco antes de
 * qualquer operação. A função é idempotente — reutiliza a conexão aberta.
 */

import { openDB, IDBPDatabase } from "idb";

// Nome e versão do banco no IndexedDB do browser
const DB_NAME = "soluteg-offline";
const DB_VERSION = 1;

// Tipo que espelha WorkOrderSummary do backend (technicianDb.ts)
// Datas vêm como string ISO quando serializadas pelo superjson/IndexedDB
export type OfflineOrder = {
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
  // Campo interno: quando esta OS foi salva localmente pela última vez
  _savedAt: number; // Date.now()
};

// Entradas possíveis no store de metadados
export type MetadataKey =
  | "lastSync"       // timestamp da última sincronização (number)
  | "technicianId";  // id do técnico logado (number)

// Instância singleton — evita abrir múltiplas conexões
let dbInstance: IDBPDatabase | null = null;

/**
 * Abre (ou retorna já aberta) a conexão com o IndexedDB.
 * Cria os object stores na primeira execução ou em upgrades de versão.
 */
export async function openOfflineDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Store principal de OS — keyPath "id" permite getAll(), get(id), delete(id)
      if (!db.objectStoreNames.contains("orders")) {
        db.createObjectStore("orders", { keyPath: "id" });
        console.log("[OFFLINE] Store 'orders' criado no IndexedDB");
      }

      // Store de metadados — chave livre (ex: "lastSync", "technicianId")
      if (!db.objectStoreNames.contains("metadata")) {
        db.createObjectStore("metadata", { keyPath: "key" });
        console.log("[OFFLINE] Store 'metadata' criado no IndexedDB");
      }
    },
    blocked() {
      console.warn("[OFFLINE] IndexedDB bloqueado por outra aba — feche as outras abas e recarregue.");
    },
    blocking() {
      // Esta aba está impedindo uma versão mais nova de abrir
      dbInstance?.close();
      dbInstance = null;
    },
  });

  return dbInstance;
}

// ---------------------------------------------------------------------------
// CRUD — store "orders"
// ---------------------------------------------------------------------------

/** Salva ou substitui uma OS no cache local. */
export async function saveOrder(order: OfflineOrder): Promise<void> {
  const db = await openOfflineDB();
  await db.put("orders", order);
}

/** Retorna uma OS pelo id, ou undefined se não existir. */
export async function getOrder(id: number): Promise<OfflineOrder | undefined> {
  const db = await openOfflineDB();
  return db.get("orders", id);
}

/** Retorna todas as OS salvas localmente, ordenadas por createdAt desc. */
export async function getAllOrders(): Promise<OfflineOrder[]> {
  const db = await openOfflineDB();
  const all = await db.getAll("orders");
  return all.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/** Remove uma OS do cache (ex: OS desatribuída do técnico). */
export async function deleteOrder(id: number): Promise<void> {
  const db = await openOfflineDB();
  await db.delete("orders", id);
}

/** Remove todas as OS do cache (ex: logout ou troca de técnico). */
export async function clearAllOrders(): Promise<void> {
  const db = await openOfflineDB();
  await db.clear("orders");
}

// ---------------------------------------------------------------------------
// CRUD — store "metadata"
// ---------------------------------------------------------------------------

/** Lê um valor de metadado. Retorna undefined se não existir. */
export async function getMetadata(key: MetadataKey): Promise<number | undefined> {
  const db = await openOfflineDB();
  const row = await db.get("metadata", key);
  return row?.value as number | undefined;
}

/** Salva ou atualiza um valor de metadado. */
export async function setMetadata(key: MetadataKey, value: number): Promise<void> {
  const db = await openOfflineDB();
  await db.put("metadata", { key, value });
}
