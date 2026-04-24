// ============================================================
// Funções de autenticação do app mobile.
// O JWT de cada portal é salvo no SecureStore do dispositivo
// (equivalente a um cofre criptografado no celular).
// Nunca salve tokens em AsyncStorage simples — ele não é criptografado.
// ============================================================
import * as SecureStore from "expo-secure-store";

// Chaves internas usadas para identificar cada dado no SecureStore
const TECH_JWT  = "tech_jwt";
const TECH_ID   = "tech_id";
const TECH_NAME = "tech_name";

const CLIENT_JWT  = "client_jwt";
const CLIENT_ID   = "client_id";
const CLIENT_NAME = "client_name";

// ── Portal do Técnico ────────────────────────────────────────────

/** Salva a sessão do técnico após login bem-sucedido */
export async function saveTechnicianSession(
  jwt: string,
  id: number,
  name: string
) {
  await Promise.all([
    SecureStore.setItemAsync(TECH_JWT, jwt),
    SecureStore.setItemAsync(TECH_ID, String(id)),
    SecureStore.setItemAsync(TECH_NAME, name),
  ]);
}

/** Retorna o JWT do técnico, ou null se não estiver logado */
export async function getTechnicianToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TECH_JWT);
}

/** Retorna todos os dados da sessão do técnico */
export async function getTechnicianSession() {
  const [jwt, id, name] = await Promise.all([
    SecureStore.getItemAsync(TECH_JWT),
    SecureStore.getItemAsync(TECH_ID),
    SecureStore.getItemAsync(TECH_NAME),
  ]);
  if (!jwt || !id) return null;
  return { jwt, id: Number(id), name: name ?? "" };
}

/** Remove a sessão do técnico (logout) */
export async function clearTechnicianSession() {
  await Promise.all([
    SecureStore.deleteItemAsync(TECH_JWT),
    SecureStore.deleteItemAsync(TECH_ID),
    SecureStore.deleteItemAsync(TECH_NAME),
  ]);
}

// ── Portal do Cliente ────────────────────────────────────────────

/** Salva a sessão do cliente após login bem-sucedido */
export async function saveClientSession(
  jwt: string,
  id: number,
  name: string
) {
  await Promise.all([
    SecureStore.setItemAsync(CLIENT_JWT, jwt),
    SecureStore.setItemAsync(CLIENT_ID, String(id)),
    SecureStore.setItemAsync(CLIENT_NAME, name),
  ]);
}

/** Retorna o JWT do cliente, ou null se não estiver logado */
export async function getClientToken(): Promise<string | null> {
  return SecureStore.getItemAsync(CLIENT_JWT);
}

/** Retorna todos os dados da sessão do cliente */
export async function getClientSession() {
  const [jwt, id, name] = await Promise.all([
    SecureStore.getItemAsync(CLIENT_JWT),
    SecureStore.getItemAsync(CLIENT_ID),
    SecureStore.getItemAsync(CLIENT_NAME),
  ]);
  if (!jwt || !id) return null;
  return { jwt, id: Number(id), name: name ?? "" };
}

/** Remove a sessão do cliente (logout) */
export async function clearClientSession() {
  await Promise.all([
    SecureStore.deleteItemAsync(CLIENT_JWT),
    SecureStore.deleteItemAsync(CLIENT_ID),
    SecureStore.deleteItemAsync(CLIENT_NAME),
  ]);
}
