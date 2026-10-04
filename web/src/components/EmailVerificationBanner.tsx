import React, { useState } from 'react';
import { Mail, RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';
import { api, type User } from '../api/api';

interface EmailVerificationBannerProps {
  user: User | null;
}

export const EmailVerificationBanner: React.FC<EmailVerificationBannerProps> = ({ user }) => {
  const [dismissed, setDismissed] = useState(false);
  const [resending, setResending] = useState(false);

  if (!user || user.emailVerified === true || user.emailVerified === undefined || dismissed) {
    return null;
  }

  const handleResend = async () => {
    setResending(true);
    try {
      await api.resendVerification();
      toast.success('Se ha enviado un nuevo enlace de confirmación a tu correo.');
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'No se pudo reenviar el enlace de confirmación.'
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <div style={styles.banner}>
      <div style={styles.content}>
        <Mail size={18} color="var(--accent-teal)" style={{ flexShrink: 0 }} />
        <span style={styles.text}>
          Confirma tu correo electrónico (<strong>{user.email}</strong>) para asegurar el acceso a tu cuenta.{' '}
          Si no lo encuentras, revisa tu carpeta de spam.
        </span>
      </div>
      <div style={styles.actions}>
        <button
          onClick={handleResend}
          disabled={resending}
          style={styles.resendBtn}
        >
          <RefreshCw size={14} className={resending ? 'spin' : ''} />
          <span>{resending ? 'Enviando...' : 'Reenviar enlace'}</span>
        </button>
        <button
          onClick={() => setDismissed(true)}
          style={styles.closeBtn}
          aria-label="Cerrar aviso de verificación"
        >
          <X size={16} color="var(--text-muted)" />
        </button>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  banner: {
    backgroundColor: 'rgba(192, 138, 90, 0.12)',
    borderBottom: '1px solid rgba(192, 138, 90, 0.3)',
    padding: '0.65rem 1.25rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '0.75rem',
    fontSize: '0.86rem',
    color: 'var(--text-primary)',
  },
  content: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    flex: 1,
    minWidth: '260px',
  },
  text: {
    lineHeight: 1.4,
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  resendBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
    backgroundColor: 'var(--accent-teal)',
    color: 'var(--bg-color)',
    padding: '0.35rem 0.75rem',
    borderRadius: 'var(--radius-element)',
    fontWeight: 700,
    fontSize: '0.8rem',
    cursor: 'pointer',
    border: 'none',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '0.2rem',
    display: 'flex',
    alignItems: 'center',
  },
};
