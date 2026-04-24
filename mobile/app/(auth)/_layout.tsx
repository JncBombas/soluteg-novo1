// Layout do grupo de autenticação.
// O grupo "(auth)" é transparente na URL — as rotas ficam em
// /technician-login e /client-login (sem o prefixo "auth").
import { Stack } from "expo-router";

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
