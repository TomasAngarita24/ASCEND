import React, { useState } from 'react';
import { Dumbbell, Sun, Moon, Eye, EyeOff } from 'lucide-react';
import { api, type AuthSession } from '../api/api';
import { useTheme } from '../context/ThemeContext';

interface AuthViewProps {
  onSuccess: (session: AuthSession) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
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

  const isDark = theme === 'dark';

  const s: Record<string, React.CSSProperties> = {
    page: {
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      backgroundColor: isDark ? '#040816' : '#e2e8f0',
      position: 'relative',
    },
    themeToggle: {
      position: 'absolute',
      top: '1.25rem',
      right: '1.25rem',
      width: '44px',
      height: '44px',
      borderRadius: '12px',
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
      border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    },
    card: {
      backgroundColor: isDark ? '#0b1120' : '#ffffff',
      border: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid #e2e8f0',
      borderRadius: '24px',
      padding: '2.5rem 2.25rem',
      width: '100%',
      maxWidth: '420px',
      boxShadow: isDark
        ? '0 25px 60px -12px rgba(0, 0, 0, 0.7), 0 0 80px rgba(34, 240, 197, 0.03)'
        : '0 25px 60px -12px rgba(0, 0, 0, 0.1)',
    },
    logoContainer: {
      textAlign: 'center',
      marginBottom: '2rem',
    },
    logoIcon: {
      width: '72px',
      height: '72px',
      borderRadius: '50%',
      background: isDark
        ? 'linear-gradient(135deg, rgba(34,240,197,0.12), rgba(34,240,197,0.04))'
        : 'linear-gradient(135deg, rgba(13,148,136,0.12), rgba(13,148,136,0.04))',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: '0.75rem',
    },
    brandName: {
      fontSize: '1.6rem',
      fontWeight: 800,
      letterSpacing: '2px',
      color: isDark ? '#e2e8f0' : '#1e293b',
      display: 'block',
    },
    brandAccent: {
      color: isDark ? '#22f0c5' : '#0d9488',
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
      color: isDark ? '#cbd5e1' : '#334155',
      letterSpacing: '0.3px',
    },
    input: {
      width: '100%',
      padding: '0.85rem 1rem',
      borderRadius: '12px',
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f1f5f9',
      border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #cbd5e1',
      color: isDark ? '#e2e8f0' : '#1e293b',
      fontSize: '0.95rem',
      outline: 'none',
      transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
      boxSizing: 'border-box',
    },
    passwordWrapper: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
    },
    passwordInput: {
      width: '100%',
      padding: '0.85rem 2.8rem 0.85rem 1rem',
      borderRadius: '12px',
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f1f5f9',
      border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #cbd5e1',
      color: isDark ? '#e2e8f0' : '#1e293b',
      fontSize: '0.95rem',
      outline: 'none',
      transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
      boxSizing: 'border-box' as const,
    },
    eyeBtn: {
      position: 'absolute' as const,
      right: '10px',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: '4px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitBtn: {
      width: '100%',
      padding: '0.9rem',
      borderRadius: '14px',
      fontWeight: 700,
      fontSize: '1rem',
      letterSpacing: '0.5px',
      border: 'none',
      cursor: 'pointer',
      background: isDark
        ? 'linear-gradient(135deg, #22f0c5, #0ea5e9)'
        : 'linear-gradient(135deg, #0d9488, #0ea5e9)',
      color: '#ffffff',
      transition: 'opacity 0.2s ease, transform 0.1s ease',
      marginTop: '0.5rem',
      textShadow: '0 1px 2px rgba(0,0,0,0.2)',
    },
    errorAlert: {
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.08)',
      border: '1px solid rgba(239, 68, 68, 0.3)',
      color: '#ef4444',
      padding: '0.75rem',
      borderRadius: '10px',
      fontSize: '0.85rem',
      textAlign: 'center',
    },
    forgotLink: {
      textAlign: 'center',
      marginTop: '0.5rem',
    },
    forgotText: {
      color: isDark ? '#22f0c5' : '#0d9488',
      fontSize: '0.85rem',
      fontWeight: 600,
      cursor: 'pointer',
      background: 'none',
      border: 'none',
      textDecoration: 'none',
    },
    switchRow: {
      textAlign: 'center',
      marginTop: '0.75rem',
    },
    switchText: {
      color: isDark ? '#94a3b8' : '#64748b',
      fontSize: '0.88rem',
    },
    switchLink: {
      color: isDark ? '#22f0c5' : '#0d9488',
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
          ? <Sun size={20} color="#f59e0b" />
          : <Moon size={20} color="#475569" />
        }
      </button>

      <div style={s.card}>
        {/* Logo & Brand */}
        <div style={s.logoContainer}>
          <div style={s.logoIcon}>
            <Dumbbell size={36} color={isDark ? '#22f0c5' : '#0d9488'} />
          </div>
          <span style={s.brandName}>
            ASC<span style={s.brandAccent}>END</span>
          </span>
        </div>

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
                e.currentTarget.style.borderColor = isDark ? '#22f0c5' : '#0d9488';
                e.currentTarget.style.boxShadow = isDark
                  ? '0 0 0 3px rgba(34,240,197,0.15)'
                  : '0 0 0 3px rgba(13,148,136,0.15)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.08)' : '#cbd5e1';
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
                  e.currentTarget.style.borderColor = isDark ? '#22f0c5' : '#0d9488';
                  e.currentTarget.style.boxShadow = isDark
                    ? '0 0 0 3px rgba(34,240,197,0.15)'
                    : '0 0 0 3px rgba(13,148,136,0.15)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.08)' : '#cbd5e1';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              <button
                type="button"
                style={s.eyeBtn}
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword
                  ? <EyeOff size={18} color={isDark ? '#94a3b8' : '#64748b'} />
                  : <Eye size={18} color={isDark ? '#94a3b8' : '#64748b'} />
                }
              </button>
            </div>
          </div>

          {error && <div style={s.errorAlert}>{error}</div>}

          <button
            type="submit"
            disabled={loading}
            style={{
              ...s.submitBtn,
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

        {/* Forgot Password */}
        {!isRegister && (
          <div style={s.forgotLink}>
            <span style={s.forgotText}>¿Olvidaste tu contraseña?</span>
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
      </div>
    </div>
  );
};
