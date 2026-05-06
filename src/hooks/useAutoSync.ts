/**
 * useAutoSync — hook global de sincronização automática da fila offline.
 *
 * Deve ser montado UMA VEZ em App.tsx para que esteja ativo independente
 * de qual tela o técnico estiver quando a rede voltar.
 *
 * Ao detectar reconexão:
 *  1. Aguarda 2s para a rede estabilizar
 *  2. Verifica se há mutations na fila
 *  3. Processa todas via processSyncQueue()
 *  4. Dispara o evento "soluteg:sync-complete" para que as telas
 *     atualizem seus dados sem precisar saber deste hook
 */

import { useEffect } from "react";
import { toast } from "sonner";
import { processSyncQueue, getPendingCount } from "@/lib/syncQueue";

export function useAutoSync() {
  useEffect(() => {
    const handleOnline = async () => {
      // Espera 2s para a rede estabilizar antes de sincronizar
      await new Promise(r => setTimeout(r, 2000));

      const count = await getPendingCount();
      if (count === 0) return;

      const toastId = "global-sync";
      toast.loading(
        `Sincronizando ${count} alteração${count > 1 ? "ões" : ""}...`,
        { id: toastId }
      );

      const { synced, errors } = await processSyncQueue();

      if (errors === 0) {
        toast.success(
          `${synced} alteração${synced !== 1 ? "ões" : ""} sincronizada${synced !== 1 ? "s" : ""}!`,
          { id: toastId }
        );
      } else {
        toast.warning(
          `${synced} sincronizadas, ${errors} com erro — veja em Pendentes`,
          { id: toastId }
        );
      }

      // Notifica todas as telas para atualizar seus dados
      window.dispatchEvent(
        new CustomEvent("soluteg:sync-complete", { detail: { synced, errors } })
      );

      console.log(`[OFFLINE] Sync automático concluído: ${synced} ok, ${errors} erro`);
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);
}
