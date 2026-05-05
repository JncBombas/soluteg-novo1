/**
 * trpcStandalone.ts — cliente tRPC sem React Query.
 *
 * Usado pelo syncQueue para processar mutations offline fora do ciclo de vida
 * dos componentes React (em callbacks de eventos, timeouts, etc.).
 *
 * Diferenças do cliente React (main.tsx):
 *   - usa httpLink (não batch) para que cada chamada seja independente
 *   - adiciona header X-Sync-Source para rastreamento de origem no backend
 *   - inclui cookies via credentials: "include" (mesmo cookie de autenticação)
 */

import { createTRPCClient, httpLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "../../server/routers";

/** Cria um cliente tRPC standalone para uso fora do React. */
export function createSyncClient() {
  return createTRPCClient<AppRouter>({
    links: [
      httpLink({
        // Usa a mesma origem do app para garantir que o cookie seja enviado
        url: `${window.location.origin}/api/trpc`,
        transformer: superjson,
        fetch(input, init) {
          return globalThis.fetch(input, {
            ...(init ?? {}),
            // Envia o cookie technician_token junto com a requisição
            credentials: "include",
            headers: {
              ...(typeof init?.headers === "object"
                ? (init.headers as Record<string, string>)
                : {}),
              // Header de debug para identificar requisições do sync offline
              "X-Sync-Source": "technician-offline",
            },
          });
        },
      }),
    ],
  });
}
