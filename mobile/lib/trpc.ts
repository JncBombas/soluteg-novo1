// ============================================================
// Cliente tRPC para o app mobile.
//
// O "import type" garante que o código do servidor (Node.js)
// NÃO seja incluído no bundle do app — apenas os tipos TypeScript
// são importados, que são apagados pelo compilador antes do build.
//
// Isso dá ao mobile o mesmo nível de type-safety do portal web,
// sem precisar duplicar nenhuma definição de tipo.
// ============================================================
import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "../../server/routers";
import { API_URL } from "./constants";

// Instância tRPC tipada com o AppRouter do servidor
export const trpc = createTRPCReact<AppRouter>();

/**
 * Cria o cliente tRPC configurado com autenticação Bearer.
 *
 * @param getToken - Função chamada a cada request para obter o JWT atual.
 *   Usar uma função (em vez do token diretamente) permite que o token
 *   seja atualizado em memória sem precisar recriar o cliente.
 */
export function makeTrpcClient(getToken: () => string | null) {
  return trpc.createClient({
    links: [
      httpBatchLink({
        // URL base da API — aponta para o servidor Express
        url: `${API_URL}/api/trpc`,
        // superjson permite enviar tipos como Date, Map, Set corretamente
        transformer: superjson,
        async headers() {
          const token = getToken();
          if (!token) return {};

          if (__DEV__) {
            // Log útil para debugar autenticação em desenvolvimento
            console.log("[tRPC] Enviando request com Bearer Token");
          }

          // Autenticação via Bearer token (não usa cookie — mobile não suporta no Expo)
          return { Authorization: `Bearer ${token}` };
        },
      }),
    ],
  });
}
