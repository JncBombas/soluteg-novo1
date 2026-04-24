// ============================================================
// Tela de login do Portal do Cliente.
// Autentica via POST /api/client-login e salva o JWT no SecureStore.
// ============================================================
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_URL } from "@/lib/constants";
import { saveClientSession } from "@/lib/auth";

export default function ClientLoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!username.trim() || !password.trim()) {
      Alert.alert("Atenção", "Preencha usuário e senha.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/client-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        Alert.alert("Erro de login", data.message ?? "Usuário ou senha inválidos.");
        return;
      }

      if (!data.jwt) {
        Alert.alert("Erro", "Servidor não retornou token. Contate o suporte.");
        return;
      }

      await saveClientSession(data.jwt, data.clientId, data.name);
      router.replace("/client");
    } catch {
      Alert.alert("Erro de conexão", "Não foi possível conectar ao servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 px-6 py-10 justify-center gap-8">

            <TouchableOpacity onPress={() => router.back()} className="self-start">
              <Text className="text-blue-600 text-base">← Voltar</Text>
            </TouchableOpacity>

            <View className="gap-1">
              <Text className="text-3xl font-bold text-gray-900">Portal do Cliente</Text>
              <Text className="text-gray-500 text-base">Entre com suas credenciais</Text>
            </View>

            <View className="gap-5">
              <View className="gap-1.5">
                <Text className="text-sm font-semibold text-gray-700">Usuário</Text>
                <TextInput
                  className="border border-gray-300 rounded-xl px-4 py-3.5 text-base text-gray-900 bg-gray-50"
                  placeholder="Digite seu usuário"
                  placeholderTextColor="#9ca3af"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>

              <View className="gap-1.5">
                <Text className="text-sm font-semibold text-gray-700">Senha</Text>
                <TextInput
                  className="border border-gray-300 rounded-xl px-4 py-3.5 text-base text-gray-900 bg-gray-50"
                  placeholder="Digite sua senha"
                  placeholderTextColor="#9ca3af"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
              </View>

              <TouchableOpacity
                className="bg-blue-600 rounded-xl py-4 items-center mt-2"
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-bold text-base">Entrar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
