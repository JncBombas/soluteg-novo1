import { notifyOwner } from "./_core/notification";

export async function sendInviteNotification(
  email: string,
  inviteCode: string,
  whatsappNumber?: string
): Promise<{ success: boolean; link: string }> {
  const appUrl = process.env.VITE_APP_URL || "https://soluteg.manus.space";
  const inviteLink = `${appUrl}/accept-invite?code=${inviteCode}`;

  try {
    // Notificar o proprietário com o link do convite
    const notificationSent = await notifyOwner({
      title: `Novo convite criado para ${email}`,
      content: `Um novo convite foi criado para: ${email}\n\nLink de aceitação:\n${inviteLink}\n\nCódigo do convite: ${inviteCode}\n\nEste link expira em 30 dias.\n\nCompartilhe este link com o usuário via WhatsApp, e-mail ou outro meio de comunicação.`,
    });

    if (!notificationSent) {
      console.warn("Failed to send notification to owner");
    }

    return { success: true, link: inviteLink };
  } catch (error) {
    console.error("Erro ao notificar proprietário:", error);
    return { success: false, link: inviteLink };
  }
}

export function generateInviteLink(code: string): string {
  const appUrl = process.env.VITE_APP_URL || "https://soluteg.manus.space";
  return `${appUrl}/accept-invite?code=${code}`;
}
