/**
 * emailService.ts
 *
 * Serviço de envio de email via SMTP (nodemailer).
 * Usado como fallback quando o WhatsApp falha ao entregar alertas.
 *
 * Variáveis de ambiente necessárias:
 *   SMTP_HOST  — ex: smtp.gmail.com
 *   SMTP_PORT  — ex: 587
 *   SMTP_USER  — seu email
 *   SMTP_PASS  — senha de app (não a senha normal)
 *   EMAIL_FROM — ex: alertas@soluteg.com.br
 *   EMAIL_TO_ADMIN — destinatário padrão dos alertas de admin
 */

import nodemailer from "nodemailer";

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

/**
 * Envia email de alerta de caixa d'água.
 * Retorna true se enviado com sucesso, false caso contrário.
 */
export async function sendAlertEmail(subject: string, body: string): Promise<boolean> {
  const from = process.env.EMAIL_FROM;
  const to = process.env.EMAIL_TO_ADMIN;

  if (!from || !to) {
    console.warn("[EMAIL] EMAIL_FROM ou EMAIL_TO_ADMIN não configurados — email não enviado");
    return false;
  }

  const transporter = createTransporter();
  if (!transporter) {
    console.warn("[EMAIL] SMTP não configurado — email não enviado");
    return false;
  }

  try {
    await transporter.sendMail({
      from,
      to,
      subject,
      text: body,
      html: body.replace(/\n/g, "<br>"),
    });
    console.log(`[EMAIL] Alerta enviado para ${to}: ${subject}`);
    return true;
  } catch (err: any) {
    console.error("[EMAIL] Erro ao enviar:", err?.message);
    return false;
  }
}
