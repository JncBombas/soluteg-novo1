// ============================================================
// Layout do Portal do Técnico.
//
// Responsabilidades:
// 1. Verificar se há sessão ativa (JWT no SecureStore)
// 2. Se não houver, redirecionar para o login
// 3. Criar o cliente tRPC com o Bearer token do técnico
// 4. Criar o QueryClient exclusivo deste portal
//
// useRef garante que o cliente tRPC e o QueryClient são criados
// UMA única vez e não são recriados a cada re-render.
// ============================================================
import { useEffect, useRef, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { Stack, router } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc, makeTrpcClient } from "@/lib/trpc";
import { getTechnicianToken } from "@/lib/auth";

export default function TechnicianLayout() {
  // undefined = carregando | string = logado (token disponível)
  const [ready, setReady] = useState(false);

  // tokenRef armazena o token atual — a função passada ao makeTrpcClient
  // lê daqui a cada request, garantindo que atualizações de token funcionem
  const tokenRef = useRef<string | null>(null);

  // QueryClient exclusivo do portal do técnico
  const queryClient = useRef(
    new QueryClient({
      defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
    })
  ).current;

  // Cliente tRPC configurado com Bearer token
  const trpcClient = useRef(
    makeTrpcClient(() => tokenRef.current)
  ).current;

  useEffect(() => {
    getTechnicianToken().then((token) => {
      if (!token) {
        // Sem sessão → redireciona para o login do técnico
        router.replace("/technician-login");
      } else {
        tokenRef.current = token;
        setReady(true);
      }
    });
  }, []);

  // Exibe spinner enquanto verifica a sessão
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
