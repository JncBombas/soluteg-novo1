/**
 * usePushNotifications.ts
 *
 * Hook que gerencia todo o ciclo de vida das notificações push no browser.
 *
 * Responsabilidades:
 *   - Detectar se o browser suporta Web Push
 *   - Verificar o estado atual da permissão (default / granted / denied)
 *   - Verificar se já existe uma subscription ativa para este dispositivo
 *   - Expor `subscribe()` — solicita permissão e registra no backend
 *   - Expor `unsubscribe()` — remove subscription local e no backend
 *
 * Parâmetro `portal`:
 *   'client'     → usa trpc.pushSubscriptions.subscribeClient
 *   'technician' → usa trpc.pushSubscriptions.subscribeTechnician
 *
 * iOS < 16.4 não suporta Web Push em PWA → isSupported=false
 * (não é necessário tratar separadamente; PushManager não existe nesses browsers)
 */

import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";

export type PushPermission = "default" | "granted" | "denied";

export type UsePushNotificationsResult = {
  /** true = browser suporta Web Push (Notification + SW + PushManager) */
  isSupported: boolean;
  /** Estado atual da permissão */
  permission: PushPermission;
  /** true = este dispositivo tem subscription ativa registrada */
  isSubscribed: boolean;
  /** true = operação de subscribe/unsubscribe em andamento */
  isLoading: boolean;
  /** Solicita permissão e registra subscription no backend */
  subscribe: () => Promise<void>;
  /** Remove subscription deste dispositivo no browser e no backend */
  unsubscribe: () => Promise<void>;
};

// Converte a VAPID public key (base64url) para Uint8Array, que é o formato
// que o pushManager.subscribe() aceita em applicationServerKey
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from(Array.from(rawData).map(c => c.charCodeAt(0)));
}

// Converte ArrayBuffer para base64 — necessário para serializar as chaves p256dh/auth
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...Array.from(new Uint8Array(buffer))));
}

export function usePushNotifications(
  portal: "client" | "technician"
): UsePushNotificationsResult {
  const [isSupported, setIsSupported]     = useState(false);
  const [permission, setPermission]       = useState<PushPermission>("default");
  const [isSubscribed, setIsSubscribed]   = useState(false);
  const [isLoading, setIsLoading]         = useState(false);
  const [currentEndpoint, setCurrentEndpoint] = useState<string | null>(null);

  // Busca a chave VAPID pública do servidor (necessária para criar subscription)
  const vapidQuery = trpc.pushSubscriptions.getVapidPublicKey.useQuery(undefined, {
    enabled: isSupported,
    staleTime: Infinity, // a chave nunca muda em runtime
    retry: false,
  });

  // Mutations — selecionadas pelo portal para garantir o procedure correto
  const subscribeClientMut    = trpc.pushSubscriptions.subscribeClient.useMutation();
  const unsubscribeClientMut  = trpc.pushSubscriptions.unsubscribeClient.useMutation();
  const subscribeTechMut      = trpc.pushSubscriptions.subscribeTechnician.useMutation();
  const unsubscribeTechMut    = trpc.pushSubscriptions.unsubscribeTechnician.useMutation();

  const subscribeMut   = portal === "client" ? subscribeClientMut   : subscribeTechMut;
  const unsubscribeMut = portal === "client" ? unsubscribeClientMut : unsubscribeTechMut;

  // Detecta suporte e estado inicial da permissão na montagem
  useEffect(() => {
    const supported =
      "Notification" in window &&
      "serviceWorker" in navigator &&
      "PushManager" in window;

    setIsSupported(supported);
    if (supported) {
      setPermission(Notification.permission as PushPermission);
    }
  }, []);

  // Verifica se já existe subscription ativa neste browser
  useEffect(() => {
    if (!isSupported) return;
    navigator.serviceWorker.ready
      .then(reg => reg.pushManager.getSubscription())
      .then(sub => {
        if (sub) {
          setIsSubscribed(true);
          setCurrentEndpoint(sub.endpoint);
        }
      })
      .catch(() => {/* Silencioso — pode falhar em SSR/dev */});
  }, [isSupported]);

  const subscribe = useCallback(async () => {
    if (!isSupported) return;
    if (!vapidQuery.data?.vapidPublicKey) {
      console.warn("[PUSH] VAPID public key não disponível");
      return;
    }
    setIsLoading(true);
    try {
      // 1. Solicita permissão ao usuário
      const perm = await Notification.requestPermission();
      setPermission(perm as PushPermission);
      if (perm !== "granted") return;

      // 2. Aguarda SW registrado e cria subscription no PushManager
      const registration  = await navigator.serviceWorker.ready;
      const appServerKey  = urlBase64ToUint8Array(vapidQuery.data.vapidPublicKey);
      const subscription  = await registration.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: appServerKey as unknown as BufferSource,
      });

      // 3. Extrai as chaves de criptografia
      const p256dh = subscription.getKey("p256dh");
      const auth   = subscription.getKey("auth");
      if (!p256dh || !auth) throw new Error("Chaves de push não disponíveis");

      // 4. Registra no backend (userId vem do ctx JWT — nunca do input)
      await subscribeMut.mutateAsync({
        endpoint:  subscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(p256dh),
          auth:   arrayBufferToBase64(auth),
        },
        userAgent: navigator.userAgent,
      });

      setIsSubscribed(true);
      setCurrentEndpoint(subscription.endpoint);
    } catch (err) {
      console.error("[PUSH] Erro ao ativar notificações:", err);
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, vapidQuery.data, subscribeMut]);

  const unsubscribe = useCallback(async () => {
    setIsLoading(true);
    try {
      // Remove a subscription do browser
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) await subscription.unsubscribe();

      // Marca active=0 no backend (usa endpoint como identificador)
      const endpoint = currentEndpoint ?? subscription?.endpoint;
      if (endpoint) {
        await unsubscribeMut.mutateAsync({ endpoint });
      }

      setIsSubscribed(false);
      setCurrentEndpoint(null);
    } catch (err) {
      console.error("[PUSH] Erro ao desativar notificações:", err);
    } finally {
      setIsLoading(false);
    }
  }, [currentEndpoint, unsubscribeMut]);

  return { isSupported, permission, isSubscribed, isLoading, subscribe, unsubscribe };
}
