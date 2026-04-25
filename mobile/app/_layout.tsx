// Layout raiz do app.
// Importa o CSS global (necessário para o NativeWind/Tailwind funcionar)
// e define a estrutura de navegação principal via Expo Router.
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

// Nota: o import do global.css está comentado temporariamente para diagnóstico.
// Se o app carregar sem ele, o problema está no NativeWind.
// Descomente quando confirmar que o resto funciona.
// import "../global.css";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}
