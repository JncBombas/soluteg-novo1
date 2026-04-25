// Tela inicial SIMPLIFICADA para diagnóstico.
// Sem NativeWind (className), sem tRPC — apenas React Native puro.
// Se isso funcionar, o problema está no NativeWind ou no tRPC setup.
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>JNC Elétrica</Text>
      <Text style={styles.subtitle}>Selecione seu portal de acesso</Text>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: "#fff" }]}
        onPress={() => router.push("/technician")}
      >
        <Text style={styles.buttonTextDark}>🔧 Portal do Técnico</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: "#1d4ed8" }]}
        onPress={() => router.push("/client")}
      >
        <Text style={styles.buttonTextLight}>👤 Portal do Cliente</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1d4ed8",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 16,
  },
  title: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    color: "#bfdbfe",
    fontSize: 16,
    marginBottom: 16,
  },
  button: {
    width: "100%",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },
  buttonTextDark: {
    color: "#1d4ed8",
    fontSize: 16,
    fontWeight: "bold",
  },
  buttonTextLight: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
