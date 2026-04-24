// ============================================================
// Layout raiz do app.
// Importa o CSS global (necessário para o NativeWind/Tailwind funcionar)
// e define a estrutura de navegação principal via Expo Router.
// ============================================================
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../global.css";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      {/* headerShown: false — cada tela define seu próprio cabeçalho */}
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}
