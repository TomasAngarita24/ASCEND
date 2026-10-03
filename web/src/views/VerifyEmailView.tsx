import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Mail, ArrowRight, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../api/api';

export const VerifyEmailView: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token');
  const navigate = useNavigate();

  const [tokenInput, setTokenInput] = useState(tokenFromUrl || '');
  const [verifying, setVerifying] = useState<boolean>(Boolean(tokenFromUrl));
  const [success, setSuccess] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resending, setResending] = useState<boolean>(false);
  const [resentSuccess, setResentSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (!tokenFromUrl) return;

    let isMounted = true;
    setVerifying(true);
    setErrorMsg(null);

    api
      .verifyEmail(tokenFromUrl)
      .then(() => {
        if (!isMounted) return;
        setSuccess(true);
        toast.success('¡Correo verificado con éxito!');
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        setErrorMsg(
          err instanceof Error
            ? err.message
            : 'No se pudo verificar el correo electrónico. El enlace puede ser inválido o haber expirado.'
        );
      })
      .finally(() => {
        if (isMounted) setVerifying(false);
      });

    return () => {
      isMounted = false;
    };
  }, [tokenFromUrl]);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;

    setVerifying(true);
    setErrorMsg(null);

    try {
      await api.verifyEmail(tokenInput.trim());
      setSuccess(true);
      toast.success('¡Correo verificado con éxito!');
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Error al verificar el token. Verifica que el código sea correcto.'
      );
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setResentSuccess(false);
    try {
      await api.resendVerification();
      setResentSuccess(true);
      toast.success('Se ha reenviado un nuevo correo de confirmación.');
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'No se pudo reenviar el correo. Asegúrate de haber iniciado sesión.'
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.iconWrap}>
          {success ? (
            <CheckCircle2 size={48} color="var(--accent-green)" />
          ) : errorMsg ? (
            <AlertCircle size={48} color="var(--danger-color)" />
          ) : (
            <Mail size={48} color="var(--accent-teal)" />
          )}
        </div>

        <h1 style={styles.title}>
          {success
            ? '¡Cuenta Verificada!'
            : errorMsg
            ? 'Error de Verificación'
            : verifying
            ? 'Verificando Correo...'
            : 'Verifica tu Correo Electrónico'}
        </h1>

        {verifying ? (
          <p style={styles.text}>
            Por favor espera mientras validamos tu token de confirmación...
          </p>
        ) : success ? (
          <div>
            <p style={styles.text}>
              Tu dirección de correo electrónico ha sido confirmada con éxito. Ya puedes acceder a todas las funcionalidades de ASCEND.
            </p>
            <button style={styles.primaryBtn} onClick={() => navigate('/')}>
              <span>Ir al Panel Principal</span>
              <ArrowRight size={18} />
            </button>
          </div>
        ) : (
          <div>
            <p style={styles.text}>
              {errorMsg ||
                'Ingresa el token que recibiste en tu correo de confirmación o haz clic en el botón de reenvío si no lo has recibido.'}
            </p>

            <form onSubmit={handleManualSubmit} style={styles.form}>
              <input
                type="text"
                placeholder="Código de verificación o token..."
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                style={styles.input}
              />
              <button
                type="submit"
                disabled={verifying || !tokenInput.trim()}
                style={styles.primaryBtn}
              >
                <span>{verifying ? 'Verificando...' : 'Confirmar Token'}</span>
              </button>
            </form>

            <div style={styles.resendDivider}>
              <span style={styles.resendText}>¿No recibiste el correo?</span>
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                style={styles.resendBtn}
              >
                <RefreshCw size={15} className={resending ? 'spin' : ''} />
                <span>{resending ? 'Enviando...' : 'Reenviar correo de confirmación'}</span>
              </button>
              {resentSuccess && (
                <p style={styles.successNote}>
                  ✓ Revisa tu bandeja de entrada o carpeta de correo no deseado (spam).
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '80vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem 1rem',
    boxSizing: 'border-box',
  },
  card: {
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-container)',
    padding: '2.5rem clamp(1.5rem, 4vw, 3rem)',
    maxWidth: '480px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.2)',
  },
  iconWrap: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-subtle)',
    marginBottom: '1.25rem',
  },
  title: {
    fontSize: '1.6rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
    marginBottom: '0.75rem',
  },
  text: {
    fontSize: '0.92rem',
    color: 'var(--text-muted)',
    lineHeight: 1.6,
    marginBottom: '1.5rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.85rem',
    marginBottom: '1.5rem',
  },
  input: {
    width: '100%',
    padding: '0.8rem 1rem',
    borderRadius: 'var(--radius-element)',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--input-bg)',
    color: 'var(--text-primary)',
    fontSize: '0.92rem',
    textAlign: 'center',
    boxSizing: 'border-box',
  },
  primaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    width: '100%',
    padding: '0.85rem 1.5rem',
    borderRadius: 'var(--radius-container)',
    backgroundColor: 'var(--accent-teal)',
    color: 'var(--bg-color)',
    fontWeight: 800,
    fontSize: '0.95rem',
    cursor: 'pointer',
    border: 'none',
  },
  resendDivider: {
    marginTop: '1.5rem',
    paddingTop: '1.25rem',
    borderTop: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
  },
  resendText: {
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
  },
  resendBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.45rem',
    background: 'none',
    border: 'none',
    color: 'var(--accent-teal)',
    fontSize: '0.88rem',
    fontWeight: 700,
    cursor: 'pointer',
    padding: '0.35rem 0.65rem',
  },
  successNote: {
    fontSize: '0.8rem',
    color: 'var(--accent-green)',
    marginTop: '0.4rem',
  },
};
