import nodemailer from 'nodemailer';

import { env } from '../../config/env';

export type PasswordResetLinkHandler = (email: string, resetUrl: string) => Promise<void> | void;
export type EmailVerificationLinkHandler = (email: string, verifyUrl: string) => Promise<void> | void;

const RESET_EMAIL_SUBJECT = 'Restablece tu contraseña de ASCEND';
const VERIFY_EMAIL_SUBJECT = 'Confirma tu cuenta de ASCEND';

let customLinkHandler: PasswordResetLinkHandler | null = null;
let customVerificationLinkHandler: EmailVerificationLinkHandler | null = null;

type SmtpTransport = ReturnType<typeof nodemailer.createTransport>;

let transporter: SmtpTransport | null = null;

/** Test hook: intercept the reset link instead of sending it. */
export function setPasswordResetLinkHandler(handler: PasswordResetLinkHandler | null): void {
  customLinkHandler = handler;
}

/** Test hook: intercept the verification link instead of sending it. */
export function setEmailVerificationLinkHandler(handler: EmailVerificationLinkHandler | null): void {
  customVerificationLinkHandler = handler;
}

import net from 'node:net';

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
      getSocket(options, callback) {
        // Enforce IPv4 (family: 4) because hosting environments like Render lack outbound IPv6 routing
        const port = Number(options.port) || env.smtp.port;
        const host = options.host || env.smtp.host;
        const socket = net.connect(
          {
            host,
            port,
            family: 4,
          },
          () => {
            callback(null, { connection: socket });
          },
        );
        socket.once('error', (err) => callback(err));
      },
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

async function sendVerificationEmail(email: string, verifyUrl: string): Promise<void> {
  if (customVerificationLinkHandler) {
    await customVerificationLinkHandler(email, verifyUrl);
    return;
  }

  const smtp = getTransporter();
  if (!smtp) {
    if (env.nodeEnv === 'production') {
      console.error('[email-verification] SMTP credentials are not configured; verification emails cannot be sent.');
    } else {
      console.log(`[email-verification] ${email} -> ${verifyUrl}`);
    }
    return;
  }

  try {
    await smtp.sendMail({
      from: fromAddress(),
      to: email,
      subject: VERIFY_EMAIL_SUBJECT,
      html:
        `<p>¡Bienvenido a ASCEND!</p>` +
        `<p>Por favor confirma tu dirección de correo electrónico haciendo clic en el siguiente enlace:</p>` +
        `<p><a href="${verifyUrl}">Confirmar mi correo electrónico</a></p>` +
        `<p>Si no creaste una cuenta en ASCEND, puedes ignorar este mensaje.</p>`,
    });
  } catch (err) {
    console.error('[email-verification] SMTP error:', err);
    throw new Error(`Failed to send verification email.`);
  }
}

export function sendVerificationEmailWithLink(email: string, verifyUrl: string): Promise<void> {
  return sendVerificationEmail(email, verifyUrl);
}