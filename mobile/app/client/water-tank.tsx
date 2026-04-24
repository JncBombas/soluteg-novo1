// ============================================================
// Tela de monitoramento das caixas d'água — Portal do Cliente.
//
// Exibe para o cliente:
// - Nível atual de cada caixa (barra de progresso animada)
// - Status do sinal (ao vivo / sem sinal / fora do ar)
// - Última atualização
//
// Os dados vêm do router waterTankMonitoring.getLatest via tRPC.
// ============================================================
import { View, Text, ScrollView, RefreshControl, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { trpc } from "@/lib/trpc";

export default function WaterTankScreen() {
  const { data, isLoading, refetch, isRefetching } =
    trpc.waterTankMonitoring.getLatest.useQuery();

  const tanks = data ?? [];

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#2563eb"
          />
        }
      >
        {isLoading ? (
          <View className="py-16 items-center">
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        ) : tanks.length === 0 ? (
          <View className="py-16 items-center gap-3">
            <Text className="text-4xl">💧</Text>
            <Text className="text-gray-500 text-base text-center">
              Nenhuma caixa d'água monitorada
            </Text>
          </View>
        ) : (
          tanks.map((tank) => (
            <TankCard key={`${tank.tankName}-${tank.clientId}`} tank={tank} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Componente de card de cada caixa ─────────────────────────────

function TankCard({ tank }: { tank: any }) {
  const level   = Math.max(0, Math.min(100, tank.currentLevel ?? 0));
  const signal  = getSignalStatus(tank.measuredAt);

  // Cor da barra de nível baseada no percentual
  const barColor =
    level < 20 ? "#ef4444" :
    level < 40 ? "#f97316" :
    level < 60 ? "#f59e0b" :
    "#10b981";

  return (
    <View className="bg-white rounded-2xl p-5 gap-4 shadow-sm">
      {/* Nome da caixa + badge de sinal */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Text className="text-xl">🪣</Text>
          <Text className="text-base font-bold text-gray-900">
            {tank.tankName ?? "Caixa d'água"}
          </Text>
        </View>
        <SignalBadge status={signal} />
      </View>

      {/* Percentual + barra de nível */}
      <View className="gap-2">
        <View className="flex-row items-end justify-between">
          <Text
            className="text-4xl font-bold"
            style={{ color: barColor }}
          >
            {level.toFixed(0)}%
          </Text>
          <Text className="text-sm text-gray-400 mb-1">nível atual</Text>
        </View>

        {/* Barra de progresso */}
        <View className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <View
            className="h-full rounded-full"
            style={{ width: `${level}%`, backgroundColor: barColor }}
          />
        </View>

        {/* Rótulos mín/máx */}
        <View className="flex-row justify-between">
          <Text className="text-xs text-gray-400">0% (vazia)</Text>
          <Text className="text-xs text-gray-400">100% (cheia)</Text>
        </View>
      </View>

      {/* Última atualização */}
      {tank.measuredAt && (
        <Text className="text-xs text-gray-400 text-right">
          Atualizado: {new Date(tank.measuredAt).toLocaleString("pt-BR")}
        </Text>
      )}
    </View>
  );
}

// ── Badge de status do sinal ──────────────────────────────────────

type SignalStatus = "live" | "weak" | "offline";

function getSignalStatus(measuredAt: string | Date | null | undefined): SignalStatus {
  if (!measuredAt) return "offline";
  const diffMin = (Date.now() - new Date(measuredAt).getTime()) / 60_000;
  if (diffMin < 3)  return "live";
  if (diffMin < 10) return "weak";
  return "offline";
}

function SignalBadge({ status }: { status: SignalStatus }) {
  if (status === "live") {
    return (
      <View className="flex-row items-center gap-1.5 bg-green-50 rounded-full px-2.5 py-1">
        <View className="w-2 h-2 bg-green-500 rounded-full" />
        <Text className="text-xs font-medium text-green-700">Ao vivo</Text>
      </View>
    );
  }
  if (status === "weak") {
    return (
      <View className="flex-row items-center gap-1.5 bg-yellow-50 rounded-full px-2.5 py-1">
        <View className="w-2 h-2 bg-yellow-500 rounded-full" />
        <Text className="text-xs font-medium text-yellow-700">Sem sinal</Text>
      </View>
    );
  }
  return (
    <View className="flex-row items-center gap-1.5 bg-gray-100 rounded-full px-2.5 py-1">
      <View className="w-2 h-2 bg-gray-400 rounded-full" />
      <Text className="text-xs font-medium text-gray-500">Fora do ar</Text>
    </View>
  );
}
