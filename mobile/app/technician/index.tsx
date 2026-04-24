// ============================================================
// Tela principal do Portal do Técnico.
// Exibe um resumo (cards de métricas) e a lista de todas as
// ordens de serviço atribuídas ao técnico logado.
// ============================================================
import { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { trpc } from "@/lib/trpc";
import { clearTechnicianSession, getTechnicianSession } from "@/lib/auth";
import { WO_STATUS_COLOR, WO_STATUS_LABEL, WO_TYPE_LABEL } from "@/lib/constants";

export default function TechnicianHomeScreen() {
  const [techName, setTechName] = useState("");

  // Carrega o nome do técnico do SecureStore (apenas para exibir no header)
  useEffect(() => {
    getTechnicianSession().then((s) => {
      if (s) setTechName(s.name);
    });
  }, []);

  // Busca todas as OS atribuídas ao técnico logado
  const { data, isLoading, refetch, isRefetching } =
    trpc.technicianPortal.getMyWorkOrders.useQuery();

  async function handleLogout() {
    await clearTechnicianSession();
    router.replace("/");
  }

  const orders = data ?? [];

  // Métricas calculadas no cliente para evitar uma query extra ao servidor
  const pendentes = orders.filter((o) =>
    ["aberta", "aprovada", "aguardando_aprovacao"].includes(o.status)
  ).length;
  const emAndamento = orders.filter((o) => o.status === "em_andamento").length;
  const concluidas  = orders.filter((o) => o.status === "concluida").length;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>

      {/* Header azul com nome do técnico e botão de logout */}
      <View className="bg-blue-700 px-4 py-4 flex-row items-center justify-between">
        <View>
          <Text className="text-white font-bold text-lg">
            Olá, {techName || "Técnico"}
          </Text>
          <Text className="text-blue-200 text-sm">Portal do Técnico</Text>
        </View>
        <TouchableOpacity
          onPress={handleLogout}
          className="bg-blue-800 rounded-lg px-3 py-2"
          activeOpacity={0.8}
        >
          <Text className="text-white text-sm font-medium">Sair</Text>
        </TouchableOpacity>
      </View>

      {/* Cards de resumo */}
      <View className="flex-row gap-3 px-4 py-4">
        <MetricCard label="Total"      value={orders.length} color="text-gray-800" bg="bg-white" />
        <MetricCard label="Pendentes"  value={pendentes}     color="text-amber-600" bg="bg-amber-50" />
        <MetricCard label="Andamento"  value={emAndamento}   color="text-blue-600"  bg="bg-blue-50" />
        <MetricCard label="Concluídas" value={concluidas}    color="text-green-600" bg="bg-green-50" />
      </View>

      {/* Lista de ordens de serviço */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => String(item.id)}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#2563eb"
            />
          }
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16, gap: 12 }}
          ListEmptyComponent={
            <View className="items-center py-16">
              <Text className="text-gray-400 text-base">
                Nenhuma OS atribuída a você
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              className="bg-white rounded-2xl p-4 shadow-sm"
              activeOpacity={0.8}
              onPress={() => router.push(`/technician/work-order/${item.id}`)}
            >
              {/* Número da OS + badge de status */}
              <View className="flex-row items-center justify-between gap-2">
                <Text className="text-sm font-bold text-gray-500">
                  OS #{item.osNumber}
                </Text>
                <View
                  className="rounded-full px-2.5 py-0.5"
                  style={{
                    backgroundColor: `${WO_STATUS_COLOR[item.status] ?? "#6b7280"}22`,
                  }}
                >
                  <Text
                    className="text-xs font-semibold"
                    style={{ color: WO_STATUS_COLOR[item.status] ?? "#6b7280" }}
                  >
                    {WO_STATUS_LABEL[item.status] ?? item.status}
                  </Text>
                </View>
              </View>

              {/* Título e cliente */}
              <Text className="text-base font-semibold text-gray-900 mt-1.5" numberOfLines={1}>
                {item.title}
              </Text>
              {item.clientName ? (
                <Text className="text-sm text-gray-500 mt-0.5" numberOfLines={1}>
                  {item.clientName}
                </Text>
              ) : null}

              {/* Endereço */}
              {item.address ? (
                <Text className="text-xs text-gray-400 mt-1" numberOfLines={1}>
                  📍 {item.address}
                </Text>
              ) : null}

              {/* Tipo + data agendada */}
              <View className="flex-row items-center gap-2 mt-2.5">
                <View className="bg-gray-100 rounded-md px-2 py-0.5">
                  <Text className="text-xs text-gray-600">
                    {WO_TYPE_LABEL[item.type] ?? item.type}
                  </Text>
                </View>
                {item.scheduledDate ? (
                  <Text className="text-xs text-gray-400">
                    📅 {new Date(item.scheduledDate).toLocaleDateString("pt-BR")}
                  </Text>
                ) : null}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

// Componente interno: card de métrica no topo da lista
function MetricCard({
  label,
  value,
  color,
  bg,
}: {
  label: string;
  value: number;
  color: string;
  bg: string;
}) {
  return (
    <View className={`flex-1 ${bg} rounded-xl p-3 items-center`}>
      <Text className={`text-2xl font-bold ${color}`}>{value}</Text>
      <Text className="text-xs text-gray-500 mt-0.5">{label}</Text>
    </View>
  );
}
