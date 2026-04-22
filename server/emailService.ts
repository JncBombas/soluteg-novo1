import { notifyOwner } from "./_core/notification";

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Enviar e-mail usando o sistema de notificação do Manus
 * Nota: O Manus envia para o proprietário, então usamos isso para notificar sobre convites
 */
export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  try {
    // Usar o sistema de notificação do Manus para enviar
    await notifyOwner({
      title: payload.subject,
      content: payload.html || payload.text || "",
    });
    console.log(`[Email] Notification sent for: ${payload.to}`);
    return true;
  } catch (error) {
    console.error("[Email] Error:", error);
    return false;
  }
}

/**
 * Enviar e-mail de convite para novo administrador
 */
export async function sendInviteEmail(
  email: string,
  inviteCode: string,
  appUrl: string = "https://app.soluteg.com.br"
): Promise<boolean> {
  const acceptLink = `${appUrl}/accept-invite?code=${inviteCode}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f97316; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
          .button { display: inline-block; background-color: #f97316; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; font-size: 12px; color: #666; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Bem-vindo à Soluteg!</h1>
          </div>
          <div class="content">
            <p>Olá,</p>
            <p>Você foi convidado para acessar a área administrativa da <strong>Soluteg - JNC Comércio e Serviços</strong>.</p>
            <p>Para ativar sua conta e configurar suas informações de login, clique no botão abaixo:</p>
            <p style="text-align: center;">
              <a href="${acceptLink}" class="button">Aceitar Convite e Configurar Conta</a>
            </p>
            <p>Ou copie e cole este link no seu navegador:</p>
            <p style="word-break: break-all; background-color: #fff; padding: 10px; border-left: 3px solid #f97316;">
              ${acceptLink}
            </p>
            <p><strong>Importante:</strong> Este link expira em 30 dias.</p>
            <p>Se você não solicitou este convite, ignore este e-mail.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 Soluteg - JNC Comércio e Serviços. Todos os direitos reservados.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `Convite para acessar a área administrativa da Soluteg - ${email}`,
    html,
    text: `Você foi convidado para acessar a área administrativa da Soluteg.\n\nClique no link abaixo para aceitar o convite:\n${acceptLink}\n\nEste link expira em 30 dias.`,
  });
}

/**
 * Enviar e-mail de reset de senha
 */
export async function sendPasswordResetEmail(
  email: string,
  resetToken: string,
  appUrl: string = "https://app.soluteg.com.br"
): Promise<boolean> {
  const resetLink = `${appUrl}/reset-password?token=${resetToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f97316; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
          .button { display: inline-block; background-color: #f97316; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; font-size: 12px; color: #666; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Redefinir Senha</h1>
          </div>
          <div class="content">
            <p>Olá,</p>
            <p>Você solicitou para redefinir sua senha na área administrativa da Soluteg.</p>
            <p>Clique no botão abaixo para redefinir sua senha:</p>
            <p style="text-align: center;">
              <a href="${resetLink}" class="button">Redefinir Senha</a>
            </p>
            <p>Ou copie e cole este link no seu navegador:</p>
            <p style="word-break: break-all; background-color: #fff; padding: 10px; border-left: 3px solid #f97316;">
              ${resetLink}
            </p>
            <p><strong>Importante:</strong> Este link expira em 1 hora.</p>
            <p>Se você não solicitou esta ação, ignore este e-mail.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 Soluteg - JNC Comércio e Serviços. Todos os direitos reservados.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `Redefinir sua senha - Soluteg - ${email}`,
    html,
    text: `Você solicitou para redefinir sua senha.\n\nClique no link abaixo:\n${resetLink}\n\nEste link expira em 1 hora.`,
  });
}
