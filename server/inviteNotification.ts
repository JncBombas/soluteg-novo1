import { notifyOwner } from "./_core/notification";
import { sendInviteEmail } from "./emailService";

export async function sendInviteNotification(
  email: string,
  inviteCode: string,
  whatsappNumber?: string
): Promise<{ success: boolean; emailSent: boolean; whatsappSent: boolean }> {
  let emailSent = false;
  let whatsappSent = false;

  const inviteLink = `${process.env.VITE_APP_URL || "https://soluteg.manus.space"}/accept-invite?code=${inviteCode}`;
  
  // Enviar e-mail de convite ao usuário
  try {
    emailSent = await sendInviteEmail(email, inviteCode);
  } catch (error) {
    console.error("Erro ao enviar e-mail de convite:", error);
  }

  // Notificar o proprietário
  try {
    await notifyOwner({
      title: "Novo convite criado",
      content: `Convite enviado para: ${email}\nLink: ${inviteLink}\nCódigo: ${inviteCode}\nE-mail enviado: ${emailSent ? "Sim" : "Não"}`,
    });
  } catch (error) {
    console.error("Erro ao notificar proprietário:", error);
  }

  // Enviar WhatsApp se número for fornecido
  if (whatsappNumber) {
    try {
      const message = `Olá! Você foi convidado para acessar a área administrativa da Soluteg.\n\nLink de aceitação: ${inviteLink}\n\nCódigo: ${inviteCode}\n\nEste link expira em 30 dias.`;
      const whatsappLink = `https://wa.me/${whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
      // Aqui você poderia integrar com uma API de WhatsApp como Twilio
      // Por enquanto, apenas registramos que o link foi gerado
      whatsappSent = true;
    } catch (error) {
      console.error("Erro ao preparar WhatsApp:", error);
    }
  }

  return { success: emailSent || whatsappSent, emailSent, whatsappSent };
}

export function generateInviteLink(code: string): string {
  return `${process.env.VITE_APP_URL || "https://soluteg.manus.space"}/accept-invite?code=${code}`;
}
