import nodemailer from 'nodemailer';

import { env } from '../../config/env';

export type PasswordResetLinkHandler = (email: string, resetUrl: string) => Promise<void> | void;

const RESET_EMAIL_SUBJECT = 'Restablece tu contraseña de ASCEND';

let customLinkHandler: PasswordResetLinkHandler | null = null;

type SmtpTransport = ReturnType<typeof nodemailer.createTransport>;

let transporter: SmtpTransport | null = null;

/** Test hook: intercept the reset link instead of sending it. */
export function setPasswordResetLinkHandler(handler: PasswordResetLinkHandler | null): void {
  customLinkHandler = handler;
}

function getTransporter(): SmtpTransport | null {
  if (!env.smtp.user || !env.smtp.pass) {
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: { user: env.smtp.user, pass: env.smtp.pass },
    });
  }

  return transporter;
}

function fromAddress(): string {
  return env.smtp.from ?? `ASCEND <${env.smtp.user}>`;
}

async function sendPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
  if (customLinkHandler) {
    await customLinkHandler(email, resetUrl);
    return;
  }

  // Without SMTP credentials the reset link is logged so the flow can still be
  // exercised end to end in local development. In production the URL (which
  // contains the reset token) is never written to logs: the missing
  // configuration is surfaced loudly instead, so the failure is visible.
  const smtp = getTransporter();
  if (!smtp) {
    if (env.nodeEnv === 'production') {
      console.error('[password-reset] SMTP credentials are not configured; password reset emails cannot be sent.');
    } else {
      console.log(`[password-reset] ${email} -> ${resetUrl}`);
    }
    return;
  }

  try {
    await smtp.sendMail({
      from: fromAddress(),
      to: email,
      subject: RESET_EMAIL_SUBJECT,
      html:
        `<p>Recibimos una solicitud para restablecer tu contraseña de ASCEND.</p>` +
        `<p>Para continuar, abre el siguiente enlace (expira en 60 minutos):</p>` +
        `<p><a href="${resetUrl}">Restablecer contraseña</a></p>` +
        `<p>Si no solicitaste este cambio, ignora este correo.</p>`,
    });
  } catch {
    throw new Error(`Failed to send password reset email.`);
  }
}

export function sendPasswordResetEmailWithLink(email: string, resetUrl: string): Promise<void> {
  return sendPasswordResetEmail(email, resetUrl);
}