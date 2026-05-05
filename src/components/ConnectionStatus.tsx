/**
 * ConnectionStatus — banner de status de conectividade no portal do técnico.
 *
 * Exibe:
 *   - Banner amarelo fixo no topo quando offline: "Modo offline — alterações
 *     serão sincronizadas ao voltar"
 *   - Nada quando online (não polui a UI com um badge "Online" desnecessário)
 *
 * Detecta conectividade via window online/offline events.
 * O hook useOnlineStatus() é compartilhado com useOfflineOrders para
 * garantir consistência entre os componentes.
 */

import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOfflineOrders";

export default function ConnectionStatus() {
  const isOnline = useOnlineStatus();

  // Quando online, não exibe nada — o técnico não precisa ver um badge verde
  if (isOnline) return null;

  return (
    <div
      className="w-full bg-yellow-500 text-yellow-950 px-4 py-2 flex items-center gap-2 text-sm font-medium"
      role="status"
      aria-live="polite"
    >
      <WifiOff className="w-4 h-4 flex-shrink-0" />
      <span>
        Modo offline — alterações serão sincronizadas ao voltar
      </span>
    </div>
  );
}
