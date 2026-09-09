import React, { useState } from 'react';
import { Sun, Moon, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { api, type AuthSession } from '../api/api';
import { useTheme } from '../context/ThemeContext';
import { GoogleSignIn } from '../components/GoogleSignIn';

interface AuthViewProps {
  onSuccess: (session: AuthSession) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onSuccess }) => {
  const [view, setView] = useState<'auth' | 'forgot'>('auth');
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const { theme, toggleTheme } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Por favor completa todos los campos.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const session = isRegister
        ? await api.register(email.trim(), password)
        : await api.login(email.trim(), password);
      onSuccess(session);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al autenticar.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredential = async (credential: string) => {
    setLoading(true);
    setError(null);
    try {
      const session = await api.loginWithGoogle(credential);
      onSuccess(session);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión con Google.');
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      setResetError('Ingresa tu correo electrónico.');
      return;
    }
    setResetLoading(true);
    setResetError(null);
    try {
      await api.forgotPassword(resetEmail.trim());
      setResetSent(true);
    } catch (err: unknown) {
      setResetError(err instanceof Error ? err.message : 'No fue posible enviar el correo.');
    } finally {
      setResetLoading(false);
    }
  };

  const isDark = theme === 'dark';

  const s: Record<string, React.CSSProperties> = {
    page: {
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      backgroundColor: 'var(--bg-color)',
      position: 'relative',
    },
    themeToggle: {
      position: 'absolute',
      top: '1.25rem',
      right: '1.25rem',
      width: '44px',
      height: '44px',
      borderRadius: 'var(--radius-element)',
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
      border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    },
    card: {
      backgroundColor: 'var(--surface-color)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-container)',
      padding: '2.5rem 2.25rem',
      width: '100%',
      maxWidth: '420px',
      boxShadow: '0 24px 60px -24px rgba(0, 0, 0, 0.6)',
    },
    logoContainer: {
      textAlign: 'center',
      marginBottom: '2rem',
    },
logoIcon: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: '0.75rem',
    },
    brandName: {
      fontSize: '1.6rem',
      fontWeight: 800,
      letterSpacing: '2px',
      color: 'var(--text-primary)',
      display: 'block',
    },
    brandAccent: {
      color: 'var(--accent-teal)',
    },
    form: {
      display: 'flex',
      flexDirection: 'column',
      gap: '1.25rem',
    },
    fieldGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.4rem',
    },
    label: {
      fontSize: '0.85rem',
      fontWeight: 700,
      color: 'var(--text-secondary)',
      letterSpacing: '0.3px',
    },
    input: {
      width: '100%',
      padding: '0.85rem 1rem',
      borderRadius: 'var(--radius-control)',
      backgroundColor: 'var(--input-bg)',
      border: '1px solid var(--border-color)',
      color: 'var(--text-primary)',
      fontSize: '0.95rem',
      boxSizing: 'border-box',
      outline: 'none',
      transition: 'border-color 0.2s, box-shadow 0.2s',
    },
    passwordWrapper: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
    },
    passwordInput: {
      width: '100%',
      padding: '0.85rem 3rem 0.85rem 1rem',
      borderRadius: 'var(--radius-control)',
      backgroundColor: 'var(--input-bg)',
      border: '1px solid var(--border-color)',
      color: 'var(--text-primary)',
      fontSize: '0.95rem',
      boxSizing: 'border-box',
      outline: 'none',
      transition: 'border-color 0.2s, box-shadow 0.2s',
    },
    eyeButton: {
      position: 'absolute',
      right: '0.85rem',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: 'var(--text-muted)',
      display: 'flex',
      alignItems: 'center',
      padding: '0.25rem',
    },
    submitButton: {
      width: '100%',
      padding: '0.9rem',
      borderRadius: 'var(--radius-control)',
      fontWeight: 700,
      fontSize: '1rem',
      letterSpacing: '0.5px',
      border: 'none',
      cursor: 'pointer',
      background: 'var(--accent-teal)',
      color: '#0B0D0F',
      transition: 'background-color 0.2s ease',
      marginTop: '0.5rem',
    },
    errorAlert: {
      backgroundColor: 'rgba(192, 105, 105, 0.12)',
      border: '1px solid rgba(192, 105, 105, 0.3)',
      color: 'var(--danger-color)',
      padding: '0.75rem',
      borderRadius: 'var(--radius-element)',
      fontSize: '0.85rem',
      textAlign: 'center',
    },
    forgotLink: {
      textAlign: 'center',
      marginTop: '0.5rem',
    },
    forgotText: {
      color: 'var(--accent-teal)',
      fontSize: '0.85rem',
      fontWeight: 600,
      cursor: 'pointer',
      background: 'none',
      border: 'none',
      textDecoration: 'none',
    },
    forgotTitle: {
      fontSize: '1.25rem',
      fontWeight: 800,
      color: 'var(--text-primary)',
      textAlign: 'center',
      margin: 0,
    },
    forgotDesc: {
      fontSize: '0.9rem',
      color: 'var(--text-muted)',
      textAlign: 'center',
      marginTop: '0.5rem',
      marginBottom: '1.75rem',
      lineHeight: 1.5,
    },
    resetSentBox: {
      backgroundColor: 'rgba(76, 175, 125, 0.1)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-control)',
      color: 'var(--text-secondary)',
      fontSize: '0.9rem',
      lineHeight: 1.6,
      textAlign: 'center',
      padding: '1rem 1.25rem',
    },
    backToLogin: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.4rem',
      width: '100%',
      marginTop: '1.25rem',
      color: 'var(--accent-teal)',
      fontSize: '0.9rem',
      fontWeight: 600,
      cursor: 'pointer',
      background: 'none',
      border: 'none',
      textDecoration: 'underline',
      textUnderlineOffset: '2px',
    },
    switchRow: {
      textAlign: 'center',
      marginTop: '0.75rem',
    },
    switchText: {
      color: 'var(--text-muted)',
      fontSize: '0.88rem',
    },
    switchLink: {
      color: 'var(--accent-teal)',
      fontWeight: 700,
      cursor: 'pointer',
      background: 'none',
      border: 'none',
      fontSize: '0.88rem',
      textDecoration: 'underline',
      textUnderlineOffset: '2px',
    },
  };

  return (
    <div style={s.page}>
      {/* Theme Toggle Button */}
      <button
        style={s.themeToggle}
        onClick={toggleTheme}
        title={isDark ? 'Modo claro' : 'Modo oscuro'}
      >
        {isDark
          ? <Sun size={20} color="var(--accent-gold)" />
          : <Moon size={20} color="var(--text-secondary)" />
        }
      </button>

      <div style={s.card}>
        {/* Logo & Brand */}
        <div style={s.logoContainer}>
          <div style={s.logoIcon}>
            <img src="/logo.png" alt="ASCEND" style={{ height: 40, width: 'auto', display: 'block' }} />
          </div>
          <span style={s.brandName}>
            ASC<span style={s.brandAccent}>END</span>
          </span>
        </div>

        {view === 'forgot' ? (
          <>
            <p style={s.forgotTitle}>Restablecer contraseña</p>
            <p style={s.forgotDesc}>
              Ingresa tu correo y te enviaremos un enlace para crear una nueva contraseña.
            </p>

            {resetSent ? (
              <div style={s.resetSentBox}>
                <p>
                  Si el correo <strong>{resetEmail.trim()}</strong> está registrado, recibirás un
                  enlace de recuperación. Revisa tu bandeja de entrada (y el correo no deseado).
                </p>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} style={s.form}>
                <div style={s.fieldGroup}>
                  <label style={s.label}>Correo electrónico</label>
                  <input
                    type="email"
                    placeholder="Introduce tu correo"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    style={s.input}
                    required
                  />
                </div>

                {resetError && <div style={s.errorAlert}>{resetError}</div>}

                <button
                  type="submit"
                  disabled={resetLoading}
                  style={{ ...s.submitButton, marginTop: '0.5rem', ...(resetLoading ? { opacity: 0.7 } : {}) }}
                >
                  {resetLoading ? 'Enviando...' : 'Enviar enlace de recuperación'}
                </button>
              </form>
            )}

            <button
              type="button"
              style={s.backToLogin}
              onClick={() => {
                setView('auth');
                setResetError(null);
                setResetSent(false);
              }}
            >
              <ArrowLeft size={16} />
              Volver al inicio de sesión
            </button>
          </>
        ) : (
          <>
            {/* Form */}
            <form onSubmit={handleSubmit} style={s.form}>
              <div style={s.fieldGroup}>
                <label style={s.label}>Correo</label>
                <input
                  type="email"
                  placeholder="Introduce tu correo"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={s.input}
                  required
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent-teal)';
                    e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-teal-glow)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div style={s.fieldGroup}>
                <label style={s.label}>Contraseña</label>
                <div style={s.passwordWrapper}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Introduce tu contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={s.passwordInput}
                    required
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent-teal)';
                      e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-teal-glow)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                  <button
                    type="button"
                    style={s.eyeButton}
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword
                      ? <EyeOff size={18} color="var(--text-muted)" />
                      : <Eye size={18} color="var(--text-muted)" />
                    }
                  </button>
                </div>
              </div>

              {error && <div style={s.errorAlert}>{error}</div>}

              <button
                type="submit"
                disabled={loading}
                style={{
                  ...s.submitButton,
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading
                  ? 'Procesando...'
                  : isRegister
                    ? 'Crear cuenta'
                    : 'Iniciar sesión'}
              </button>
            </form>

            <GoogleSignIn onCredential={handleGoogleCredential} />

            {/* Forgot Password */}
            {!isRegister && (
              <div style={s.forgotLink}>
                <button type="button" style={s.forgotText} onClick={() => setView('forgot')}>
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            )}

            {/* Switch Login / Register */}
            <div style={s.switchRow}>
              <span style={s.switchText}>
                {isRegister ? '¿Ya tienes una cuenta? ' : '¿No tienes una cuenta? '}
              </span>
              <button
                type="button"
                style={s.switchLink}
                onClick={() => {
                  setIsRegister(!isRegister);
                  setError(null);
                }}
              >
                {isRegister ? 'Inicia sesión' : 'Regístrate'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
