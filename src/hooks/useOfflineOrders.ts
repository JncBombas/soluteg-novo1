/**
 * useOfflineOrders — hook que gerencia o cache offline das OS do técnico.
 *
 * Expõe dois hooks principais:
 *
 *   useOrdersWithOffline()
 *     Retorna as OS do servidor (quando online) ou do IndexedDB (quando offline).
 *     Atualiza o cache automaticamente ao receber dados novos do servidor.
 *
 *   useSyncOfflineOrders()
 *     Dispara o download manual ("Atualizar OS offline") e expõe o status
 *     do download e o timestamp da última sincronização.
 */

import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import {
  saveOrder,
  getAllOrders,
  getMetadata,
  setMetadata,
  clearAllOrders,
  OfflineOrder,
} from "@/lib/offlineDB";

// ---------------------------------------------------------------------------
// useOnlineStatus — detecta conectividade em tempo real
// ---------------------------------------------------------------------------

/** Retorna true se o browser acredita estar online. */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline  = () => { setOnline(true);  console.log("[OFFLINE] Rede detectada — online"); };
    const handleOffline = () => { setOnline(false); console.log("[OFFLINE] Rede perdida — offline"); };

    window.addEventListener("online",  handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online",  handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return online;
}

// ---------------------------------------------------------------------------
// Converte OS do servidor (Dates) para o formato do IndexedDB (strings ISO)
// ---------------------------------------------------------------------------
function toOfflineOrder(os: any): OfflineOrder {
  return {
    id:            os.id,
    osNumber:      os.osNumber,
    title:         os.title,
    status:        os.status,
    priority:      os.priority,
    scheduledDate: os.scheduledDate ? new Date(os.scheduledDate).toISOString() : null,
    createdAt:     new Date(os.createdAt).toISOString(),
    clientName:    os.clientName ?? null,
    description:   os.description ?? null,
    serviceType:   os.serviceType ?? null,
    type:          os.type,
    _savedAt:      Date.now(),
  };
}

// ---------------------------------------------------------------------------
// useOrdersWithOffline
// ---------------------------------------------------------------------------

export type UseOrdersResult = {
  orders: OfflineOrder[];
  isLoading: boolean;
  isOffline: boolean;
  /** true quando os dados vêm do cache local (não do servidor) */
  fromCache: boolean;
};

/**
 * Retorna a lista de OS. Se online, busca do servidor e atualiza o cache.
 * Se offline, lê diretamente do IndexedDB.
 */
export function useOrdersWithOffline(enabled: boolean): UseOrdersResult {
  const isOnline = useOnlineStatus();
  const [cachedOrders, setCachedOrders] = useState<OfflineOrder[]>([]);
  const [loadingCache, setLoadingCache] = useState(true);

  // Carrega o cache local sempre que montar (independente de conectividade)
  useEffect(() => {
    getAllOrders()
      .then(orders => {
        setCachedOrders(orders);
        console.log(`[OFFLINE] Cache local: ${orders.length} OS carregadas do IndexedDB`);
      })
      .catch(err => console.error("[OFFLINE] Erro ao ler IndexedDB:", err))
      .finally(() => setLoadingCache(false));
  }, []);

  // Query tRPC — só roda se estiver online e autenticado
  const { data: serverOrders, isLoading: loadingServer } = (trpc as any)
    .technicianPortal.getMyWorkOrders.useQuery(undefined, {
      enabled: enabled && isOnline,
      // Não revalida em background quando offline
      refetchOnWindowFocus: isOnline,
      refetchOnReconnect: true,
      // Mantém dados anteriores enquanto carrega novos
      placeholderData: (prev: any) => prev,
    });

  // Quando o servidor retorna dados, sincroniza o IndexedDB em background
  useEffect(() => {
    if (!serverOrders || !Array.isArray(serverOrders)) return;

    const sync = async () => {
      try {
        // Remove OS que não estão mais na lista do servidor (desatribuídas)
        const serverIds = new Set((serverOrders as any[]).map((o: any) => o.id));
        const localOrders = await getAllOrders();
        for (const local of localOrders) {
          if (!serverIds.has(local.id)) {
            const { deleteOrder } = await import("@/lib/offlineDB");
            await deleteOrder(local.id);
            console.log(`[OFFLINE] OS #${local.id} removida do cache (desatribuída)`);
          }
        }

        // Salva ou atualiza todas as OS do servidor
        for (const os of serverOrders as any[]) {
          await saveOrder(toOfflineOrder(os));
        }

        await setMetadata("lastSync", Date.now());
        const updated = await getAllOrders();
        setCachedOrders(updated);
        console.log(`[OFFLINE] Cache sincronizado: ${updated.length} OS salvas`);
      } catch (err) {
        console.error("[OFFLINE] Erro ao sincronizar cache:", err);
      }
    };

    sync();
  }, [serverOrders]);

  // Online: usa dados do servidor se já chegaram, senão usa cache
  if (isOnline) {
    const orders = serverOrders
      ? (serverOrders as any[]).map(toOfflineOrder)
      : cachedOrders;
    return {
      orders,
      isLoading: loadingServer && cachedOrders.length === 0,
      isOffline: false,
      fromCache: !serverOrders,
    };
  }

  // Offline: usa apenas cache local
  return {
    orders: cachedOrders,
    isLoading: loadingCache,
    isOffline: true,
    fromCache: true,
  };
}

// ---------------------------------------------------------------------------
// useSyncOfflineOrders — download manual + timestamp de última sync
// ---------------------------------------------------------------------------

export type SyncStatus = "idle" | "downloading" | "done" | "error";

export type UseSyncResult = {
  syncStatus: SyncStatus;
  lastSync: number | null;  // timestamp ms ou null
  triggerSync: () => void;
  isOnline: boolean;
};

/**
 * Controla o botão "Atualizar OS offline" no header do portal.
 * Dispara um re-fetch forçado das OS do servidor e salva no IndexedDB.
 */
export function useSyncOfflineOrders(technicianId: number | null): UseSyncResult {
  const isOnline = useOnlineStatus();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [lastSync, setLastSync] = useState<number | null>(null);

  // Carrega o timestamp da última sync ao montar
  useEffect(() => {
    getMetadata("lastSync").then(ts => setLastSync(ts ?? null));
  }, []);

  // Busca manual via tRPC — dispara apenas quando triggerSync() for chamado
  const utils = (trpc as any).useUtils();

  const triggerSync = useCallback(async () => {
    if (!isOnline || !technicianId || syncStatus === "downloading") return;

    setSyncStatus("downloading");
    console.log("[OFFLINE] Iniciando download manual das OS...");

    try {
      // Invalida o cache do React Query e força um novo fetch
      await utils.technicianPortal.getMyWorkOrders.invalidate();
      const orders = await utils.technicianPortal.getMyWorkOrders.fetch();

      // Limpa o cache e salva as OS atualizadas
      await clearAllOrders();
      for (const os of orders as any[]) {
        await saveOrder(toOfflineOrder(os));
      }

      const now = Date.now();
      await setMetadata("lastSync", now);
      setLastSync(now);
      setSyncStatus("done");
      console.log(`[OFFLINE] Download concluído: ${orders.length} OS salvas`);

      // Volta para idle após 3 segundos
      setTimeout(() => setSyncStatus("idle"), 3000);
    } catch (err) {
      console.error("[OFFLINE] Erro no download manual:", err);
      setSyncStatus("error");
      setTimeout(() => setSyncStatus("idle"), 4000);
    }
  }, [isOnline, technicianId, syncStatus, utils]);

  return { syncStatus, lastSync, triggerSync, isOnline };
}
