// ============================================================
// Tela principal do Portal do Cliente.
// Exibe as ordens de serviço compartilhadas com o cliente logado.
// O cliente pode ver o status e os detalhes de cada OS.
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
import { clearClientSession, getClientSession } from "@/lib/auth";
import { WO_STATUS_COLOR, WO_STATUS_LABEL, WO_TYPE_LABEL } from "@/lib/constants";

export default function ClientHomeScreen() {
  const [clientName, setClientName] = useState("");

  useEffect(() => {
    getClientSession().then((s) => {
      if (s) setClientName(s.name);
    });
  }, []);

  // Busca as OS que o admin compartilhou com este cliente
  const { data, isLoading, refetch, isRefetching } =
    trpc.workOrders.getSharedForPortal.useQuery();

  async function handleLogout() {
    await clearClientSession();
    router.replace("/");
  }

  const orders = data ?? [];

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>

      {/* Header */}
      <View className="bg-blue-700 px-4 py-4 flex-row items-center justify-between">
        <View>
          <Text className="text-white font-bold text-lg">
            Olá, {clientName || "Cliente"}
          </Text>
          <Text className="text-blue-200 text-sm">Portal do Cliente</Text>
        </View>
        <View className="flex-row gap-2">
          {/* Acesso à caixa d'água */}
          <TouchableOpacity
            className="bg-blue-600 rounded-lg px-3 py-2"
            onPress={() => router.push("/client/water-tank")}
            activeOpacity={0.8}
          >
            <Text className="text-white text-sm">💧 Caixa</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-blue-800 rounded-lg px-3 py-2"
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Text className="text-white text-sm font-medium">Sair</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Lista de OS compartilhadas */}
      <View className="px-4 pt-4 pb-2">
        <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Ordens de Serviço
        </Text>
      </View>

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
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 12 }}
          ListEmptyComponent={
            <View className="items-center py-16 gap-3">
              <Text className="text-4xl">📋</Text>
              <Text className="text-gray-500 text-base text-center">
                Nenhuma OS compartilhada com você ainda
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const status = item.status as string;
            return (
              <View className="bg-white rounded-2xl p-4 shadow-sm gap-2">
                {/* Número + status */}
                <View className="flex-row items-center justify-between gap-2">
                  <Text className="text-sm font-bold text-gray-400">
                    OS #{item.osNumber}
                  </Text>
                  <View
                    className="rounded-full px-2.5 py-0.5"
                    style={{
                      backgroundColor: `${WO_STATUS_COLOR[status] ?? "#6b7280"}22`,
                    }}
                  >
                    <Text
                      className="text-xs font-semibold"
                      style={{ color: WO_STATUS_COLOR[status] ?? "#6b7280" }}
                    >
                      {WO_STATUS_LABEL[status] ?? status}
                    </Text>
                  </View>
                </View>

                {/* Título */}
                <Text className="text-base font-semibold text-gray-900" numberOfLines={1}>
                  {item.title}
                </Text>

                {/* Descrição resumida */}
                {item.description ? (
                  <Text className="text-sm text-gray-500" numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}

                {/* Tipo + data */}
                <View className="flex-row items-center gap-2 pt-1">
                  <View className="bg-gray-100 rounded-md px-2 py-0.5">
                    <Text className="text-xs text-gray-600">
                      {WO_TYPE_LABEL[item.type as string] ?? item.type}
                    </Text>
                  </View>
                  {item.scheduledDate ? (
                    <Text className="text-xs text-gray-400">
                      📅 {new Date(item.scheduledDate).toLocaleDateString("pt-BR")}
                    </Text>
                  ) : null}
                  {item.completedAt ? (
                    <Text className="text-xs text-green-600 ml-auto">
                      ✓ Concluída
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
