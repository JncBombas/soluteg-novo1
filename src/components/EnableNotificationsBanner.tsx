/**
 * EnableNotificationsBanner.tsx
 *
 * Banner discreto que convida o usuário a ativar notificações push.
 * Aparece no topo da tela — NÃO é um modal, para não interromper o fluxo.
 *
 * Condições para exibição (todas devem ser verdadeiras):
 *   1. Browser suporta Web Push (isSupported)
 *   2. Permissão ainda não foi concedida nem negada (permission === 'default')
 *   3. O usuário ainda não dispensou o banner hoje (localStorage — 7 dias)
 *   4. `show` prop é true (controlado pelo pai após primeira ação relevante)
 *
 * O botão "Agora não" persiste a dispensa por 7 dias em localStorage.
 * Se o usuário negar a permissão no diálogo do browser, o banner desaparece
 * automaticamente (permission === 'denied').
 */

import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/usePushNotifications";

const DISMISS_KEY = "soluteg_push_dismissed_until";

type Props = {
  /** 'client' ou 'technician' — define qual mutation de subscribe usar */
  portal: "client" | "technician";
  /**
   * Controlado pelo componente pai.
   * true = a primeira ação relevante já aconteceu (abrir OS, abrir Monitoramento).
   * O banner só aparece depois disso para não ser invasivo.
   */
  show: boolean;
};

export default function EnableNotificationsBanner({ portal, show }: Props) {
  const { isSupported, permission, isSubscribed, isLoading, subscribe } =
    usePushNotifications(portal);

  const [dismissed, setDismissed] = useState(false);

  // Verifica se o usuário já dispensou o banner anteriormente (localStorage)
  useEffect(() => {
    const until = localStorage.getItem(DISMISS_KEY);
    if (until && Date.now() < parseInt(until, 10)) {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    // Salva dispensa por 7 dias
    const sevenDays = Date.now() + 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem(DISMISS_KEY, String(sevenDays));
    setDismissed(true);
  };

  const handleEnable = async () => {
    await subscribe();
    // Após ativar, o banner some (isSubscribed fica true)
  };

  // Condições para esconder o banner
  if (
    !show ||
    !isSupported ||
    permission === "denied" ||
    permission === "granted" ||
    isSubscribed ||
    dismissed
  ) {
    return null;
  }

  // Texto varia por portal
  const text =
    portal === "technician"
      ? "Receba avisos de novas OS no celular, mesmo com o app fechado."
      : "Receba alertas das suas caixas d'água e ordens de serviço no celular.";

  return (
    <div className="w-full bg-blue-600 text-white px-4 py-3 flex items-center gap-3 shadow-md z-50">
      <Bell className="w-5 h-5 shrink-0" />

      <p className="flex-1 text-sm leading-snug">{text}</p>

      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          variant="secondary"
          className="bg-white text-blue-700 hover:bg-blue-50 font-semibold text-xs h-8 px-3"
          onClick={handleEnable}
          disabled={isLoading}
        >
          {isLoading ? "Ativando..." : "Ativar notificações"}
        </Button>

        <button
          onClick={handleDismiss}
          aria-label="Dispensar"
          className="text-blue-200 hover:text-white transition-colors p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
