import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Dumbbell, Lock, ArrowLeft } from 'lucide-react';
import { api } from '../api/api';

export const ResetPasswordView: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('El enlace de restablecimiento no es válido o ya fue utilizado.');
      return;
    }
    if (password.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      await api.resetPassword(token, password);
      toast.success('Contraseña restablecida. Inicia sesión con tu nueva contraseña.');
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible restablecer la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  const s: Record<string, React.CSSProperties> = {
    page: {
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      backgroundColor: 'var(--bg-color)',
    },
    card: {
      backgroundColor: 'var(--surface-color)',
      border: '1px solid var(--border-color)',
      borderRadius: '24px',
      padding: '2.5rem 2.25rem',
      width: '100%',
      maxWidth: '420px',
    },
    logoContainer: {
      textAlign: 'center',
      marginBottom: '1.5rem',
    },
    logoIcon: {
      width: '60px',
      height: '60px',
      borderRadius: '50%',
      background: 'linear-gradient(135deg, rgba(34,240,197,0.12), rgba(34,240,197,0.04))',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: '0.75rem',
    },
    title: {
      fontSize: '1.35rem',
      fontWeight: 800,
      color: 'var(--text-primary)',
      textAlign: 'center',
      margin: 0,
    },
    subtitle: {
      color: 'var(--text-muted)',
      fontSize: '0.9rem',
      textAlign: 'center',
      marginTop: '0.4rem',
    },
    form: {
      display: 'flex',
      flexDirection: 'column',
      gap: '1.1rem',
      marginTop: '1.75rem',
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
    },
    input: {
      width: '100%',
      padding: '0.85rem 1rem',
      borderRadius: '12px',
      backgroundColor: 'var(--input-bg)',
      border: '1px solid var(--border-color)',
      color: 'var(--text-primary)',
      fontSize: '0.95rem',
      boxSizing: 'border-box',
      outline: 'none',
    },
    errorAlert: {
      backgroundColor: 'rgba(239, 68, 68, 0.12)',
      border: '1px solid rgba(239, 68, 68, 0.3)',
      color: '#ef4444',
      padding: '0.75rem',
      borderRadius: '10px',
      fontSize: '0.85rem',
      textAlign: 'center',
    },
    submitButton: {
      width: '100%',
      padding: '0.9rem',
      borderRadius: '14px',
      fontWeight: 700,
      fontSize: '1rem',
      border: 'none',
      cursor: 'pointer',
      background: 'var(--accent-gradient)',
      color: '#ffffff',
      marginTop: '0.5rem',
    },
    backLink: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.4rem',
      marginTop: '1.25rem',
      color: 'var(--accent-teal)',
      fontSize: '0.88rem',
      fontWeight: 600,
      cursor: 'pointer',
      background: 'none',
      border: 'none',
      textDecoration: 'underline',
      textUnderlineOffset: '2px',
    },
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logoContainer}>
          <div style={s.logoIcon}>
            <Dumbbell size={30} color="var(--accent-teal)" />
          </div>
          <h1 style={s.title}>Restablecer contraseña</h1>
          <p style={s.subtitle}>Elige una nueva contraseña para tu cuenta ASCEND</p>
        </div>

        <form onSubmit={handleSubmit} style={s.form}>
          <div style={s.fieldGroup}>
            <label style={s.label}>Nueva contraseña</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.85rem' }} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ ...s.input, paddingLeft: '2.5rem' }}
                placeholder="Mínimo 8 caracteres"
                required
              />
            </div>
          </div>

          <div style={s.fieldGroup}>
            <label style={s.label}>Confirmar nueva contraseña</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.85rem' }} />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{ ...s.input, paddingLeft: '2.5rem' }}
                placeholder="Repite la nueva contraseña"
                required
              />
            </div>
          </div>

          {error && <div style={s.errorAlert}>{error}</div>}

          <button type="submit" disabled={loading} style={{ ...s.submitButton, opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Guardando...' : 'Restablecer contraseña'}
          </button>
        </form>

        <button type="button" style={s.backLink} onClick={() => navigate('/', { replace: true })}>
          <ArrowLeft size={16} />
          Volver al inicio de sesión
        </button>
      </div>
    </div>
  );
};