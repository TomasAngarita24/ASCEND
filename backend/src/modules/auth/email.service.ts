import { env } from '../../config/env';

export type PasswordResetLinkHandler = (email: string, resetUrl: string) => Promise<void> | void;

const RESET_EMAIL_SUBJECT = 'Restablece tu contraseña de ASCEND';

let customLinkHandler: PasswordResetLinkHandler | null = null;

/** Test hook: intercept the reset link instead of sending it. */
export function setPasswordResetLinkHandler(handler: PasswordResetLinkHandler | null): void {
  customLinkHandler = handler;
}

async function sendPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
  if (customLinkHandler) {
    await customLinkHandler(email, resetUrl);
    return;
  }

  // In production the reset link is emailed to the user. Without RESEND_API_KEY
  // configured (e.g. local development) the link is logged so the flow can be
  // exercised end to end.
  if (!env.resendApiKey) {
    console.log(`[password-reset] ${email} -> ${resetUrl}`);
    return;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.resendFromEmail,
      to: email,
      subject: RESET_EMAIL_SUBJECT,
      html:
        `<p>Recibimos una solicitud para restablecer tu contraseña de ASCEND.</p>` +
        `<p>Para continuar, abre el siguiente enlace (expira en 60 minutos):</p>` +
        `<p><a href="${resetUrl}">Restablecer contraseña</a></p>` +
        `<p>Si no solicitaste este cambio, ignora este correo.</p>`,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to send password reset email (${response.status}).`);
  }
}

export function sendPasswordResetEmailWithLink(email: string, resetUrl: string): Promise<void> {
  return sendPasswordResetEmail(email, resetUrl);
}