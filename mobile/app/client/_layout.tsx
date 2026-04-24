// ============================================================
// Layout do Portal do Cliente.
// Mesma estrutura do layout do técnico:
// verifica sessão → cria cliente tRPC → renderiza Stack.
// ============================================================
import { useEffect, useRef, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { Stack, router } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc, makeTrpcClient } from "@/lib/trpc";
import { getClientToken } from "@/lib/auth";

export default function ClientLayout() {
  const [ready, setReady] = useState(false);
  const tokenRef   = useRef<string | null>(null);

  const queryClient = useRef(
    new QueryClient({
      defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
    })
  ).current;

  const trpcClient = useRef(
    makeTrpcClient(() => tokenRef.current)
  ).current;

  useEffect(() => {
    getClientToken().then((token) => {
      if (!token) {
        // Sem sessão → redireciona para o login do cliente
        router.replace("/client-login");
      } else {
        tokenRef.current = token;
        setReady(true);
      }
    });
  }, []);

  if (!ready) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: "#1d4ed8" },
            headerTintColor: "#ffffff",
            headerTitleStyle: { fontWeight: "bold" },
            headerBackTitle: "Voltar",
          }}
        />
      </QueryClientProvider>
    </trpc.Provider>
  );
}
