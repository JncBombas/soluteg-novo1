// ============================================================
// Tela inicial do app.
// Exibe duas opções: Portal do Técnico e Portal do Cliente.
// O usuário escolhe e é direcionado para o login correspondente.
// ============================================================
import { View, Text, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-blue-700">
      <View className="flex-1 items-center justify-center px-6 gap-10">

        {/* Cabeçalho da tela */}
        <View className="items-center gap-2">
          <Text className="text-white text-4xl font-bold">JNC Elétrica</Text>
          <Text className="text-blue-200 text-base text-center">
            Selecione seu portal de acesso
          </Text>
        </View>

        {/* Botões de acesso aos portais */}
        <View className="w-full gap-4">

          {/* Portal do Técnico */}
          <TouchableOpacity
            className="bg-white rounded-2xl p-5 flex-row items-center gap-4"
            activeOpacity={0.85}
            onPress={() => router.push("/technician")}
          >
            <Text className="text-4xl">🔧</Text>
            <View className="flex-1">
              <Text className="text-blue-700 text-lg font-bold">
                Portal do Técnico
              </Text>
              <Text className="text-gray-500 text-sm">
                Acesse e gerencie suas ordens de serviço
              </Text>
            </View>
            <Text className="text-gray-400 text-xl">›</Text>
          </TouchableOpacity>

          {/* Portal do Cliente */}
          <TouchableOpacity
            className="bg-blue-600 border border-blue-400 rounded-2xl p-5 flex-row items-center gap-4"
            activeOpacity={0.85}
            onPress={() => router.push("/client")}
          >
            <Text className="text-4xl">👤</Text>
            <View className="flex-1">
              <Text className="text-white text-lg font-bold">
                Portal do Cliente
              </Text>
              <Text className="text-blue-200 text-sm">
                Acompanhe seus serviços e documentos
              </Text>
            </View>
            <Text className="text-blue-300 text-xl">›</Text>
          </TouchableOpacity>
        </View>

        <Text className="text-blue-300 text-xs">v1.0 — JNC Elétrica</Text>
      </View>
    </SafeAreaView>
  );
}
