import React, { useState } from 'react';
import { User as UserIcon, Camera, LogOut, Trash2, Check, AlertTriangle, Shield, KeyRound, Mail, Sun, Moon } from 'lucide-react';
import type { User as UserType, Tokens } from '../api/api';
import { useTheme } from '../context/ThemeContext';

export interface UserProfileCustomData {
  fullName: string;
  bio: string;
  avatarUrl: string | null;
  email: string;
}

interface SettingsViewProps {
  user: UserType;
  tokens: Tokens;
  profileData: UserProfileCustomData;
  onUpdateProfileData: (data: Partial<UserProfileCustomData>) => void;
  onLogout: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  user,
  profileData,
  onUpdateProfileData,
  onLogout,
}) => {
  const [fullName, setFullName] = useState(profileData.fullName);
  const [email, setEmail] = useState(profileData.email);
  const [bio, setBio] = useState(profileData.bio);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profileData.avatarUrl);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Security Section State
  const [secEmail, setSecEmail] = useState(profileData.email);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [secSuccess, setSecSuccess] = useState(false);
  const [secError, setSecError] = useState<string | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfileData({
      fullName: fullName.trim(),
      email: email.trim(),
      bio: bio.trim(),
      avatarUrl,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleSaveSecurity = (e: React.FormEvent) => {
    e.preventDefault();
    setSecError(null);

    if (newPassword || confirmPassword) {
      if (newPassword.length < 6) {
        setSecError('La nueva contraseña debe tener al menos 6 caracteres.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setSecError('La confirmación de la contraseña no coincide.');
        return;
      }
    }

    onUpdateProfileData({ email: secEmail.trim() });
    setSecSuccess(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setSecSuccess(false), 3000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setAvatarUrl(result);
        onUpdateProfileData({ avatarUrl: result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteAccount = () => {
    alert('Cuenta eliminada. Gracias por usar ASCEND.');
    onLogout();
  };

  const { theme, toggleTheme } = useTheme();

  return (
    <div style={styles.container}>
      {/* Page Title Header */}
      <h1 style={styles.pageTitle}>Ajustes</h1>

      {/* Appearance Card */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div style={styles.titleRow}>
            {theme === 'dark' ? <Moon size={24} color="var(--accent-teal)" /> : <Sun size={24} color="#f59e0b" />}
            <h2 style={styles.cardTitle}>Apariencia</h2>
          </div>
          <p style={styles.subtitle}>Elige entre modo oscuro o claro según tu preferencia</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'var(--card-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {theme === 'dark' ? <Moon size={20} color="var(--accent-teal)" /> : <Sun size={20} color="#f59e0b" />}
            </div>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                {theme === 'dark' ? 'Modo oscuro' : 'Modo claro'}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {theme === 'dark' ? 'Interfaz oscura para entornos con poca luz' : 'Interfaz clara para entornos iluminados'}
              </div>
            </div>
          </div>

          {/* Toggle switch */}
          <button
            onClick={toggleTheme}
            aria-label="Cambiar tema"
            style={{
              width: 56,
              height: 30,
              borderRadius: 999,
              backgroundColor: theme === 'dark' ? 'var(--accent-teal)' : '#e2e8f0',
              position: 'relative',
              transition: 'background-color 0.25s ease',
              flexShrink: 0,
              border: '2px solid var(--border-color)',
            }}
          >
            <span style={{
              position: 'absolute',
              top: 2,
              left: theme === 'dark' ? 28 : 2,
              width: 22,
              height: 22,
              borderRadius: '50%',
              backgroundColor: theme === 'dark' ? '#0b0f19' : '#ffffff',
              transition: 'left 0.25s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
            }}>
              {theme === 'dark'
                ? <Moon size={12} color="var(--accent-teal)" />
                : <Sun size={12} color="#f59e0b" />}
            </span>
          </button>
        </div>
      </div>

      {/* Profile Information Card (100% Full Width) */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div style={styles.titleRow}>
            <UserIcon size={24} color="#E6EEF3" />
            <h2 style={styles.cardTitle}>Información del perfil</h2>
          </div>
          <p style={styles.subtitle}>Actualiza tu información personal y los detalles del perfil</p>
        </div>

        {/* Photo Upload Section */}
        <div style={styles.avatarSection}>
          <div style={styles.avatarCircle}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" style={styles.avatarImg} />
            ) : (
              <span style={styles.avatarInitial}>{(fullName || user.email).charAt(0).toUpperCase()}</span>
            )}
          </div>

          <div style={styles.uploadControls}>
            <label style={styles.changePhotoBtn}>
              <Camera size={18} />
              <span>Cambiar foto</span>
              <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
            </label>
            <span style={styles.uploadHint}>JPG, GIF o PNG. Máx. 1 MB.</span>
          </div>
        </div>

        {/* Form Inputs */}
        <form onSubmit={handleSaveProfile} style={styles.form}>
          <div style={styles.formGrid}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Nombre completo</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                style={styles.input}
                placeholder="Tu nombre completo"
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Correo electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
                placeholder="tu@email.com"
              />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Biografía</label>
            <textarea
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Cuéntales a tus clientes sobre ti..."
              style={styles.textarea}
            />
          </div>

          {savedSuccess && (
            <div style={styles.successBanner}>
              <Check size={20} color="#22c55e" />
              <span>Información del perfil actualizada correctamente.</span>
            </div>
          )}

          <div style={styles.saveRow}>
            <button type="submit" style={styles.saveBtn}>
              Guardar
            </button>
          </div>
        </form>
      </div>

      {/* Security Section */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div style={styles.titleRow}>
            <Shield size={24} color="#E6EEF3" />
            <h2 style={styles.cardTitle}>Seguridad de la cuenta</h2>
          </div>
          <p style={styles.subtitle}>Actualiza tu correo electrónico y tu contraseña de acceso</p>
        </div>

        <form onSubmit={handleSaveSecurity} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>
              <Mail size={16} style={{ display: 'inline', marginRight: '6px' }} />
              Nuevo correo electrónico
            </label>
            <input
              type="email"
              value={secEmail}
              onChange={(e) => setSecEmail(e.target.value)}
              style={styles.input}
              placeholder="tu@email.com"
              required
            />
          </div>

          <div style={styles.formGrid}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>
                <KeyRound size={16} style={{ display: 'inline', marginRight: '6px' }} />
                Contraseña actual
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                style={styles.input}
                placeholder="••••••••"
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>
                <KeyRound size={16} style={{ display: 'inline', marginRight: '6px' }} />
                Nueva contraseña
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={styles.input}
                placeholder="Ingresa la nueva contraseña"
              />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Confirmar nueva contraseña</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={styles.input}
              placeholder="Confirma la nueva contraseña"
            />
          </div>

          {secError && (
            <div style={styles.errorBanner}>
              <AlertTriangle size={18} color="#ef4444" />
              <span>{secError}</span>
            </div>
          )}

          {secSuccess && (
            <div style={styles.successBanner}>
              <Check size={20} color="#22c55e" />
              <span>Credenciales de seguridad actualizadas correctamente.</span>
            </div>
          )}

          <div style={styles.saveRow}>
            <button type="submit" style={styles.secSaveBtn}>
              Actualizar seguridad
            </button>
          </div>
        </form>
      </div>

      {/* Danger Zone / Account Management Card */}
      <div style={styles.dangerCard}>
        <h2 style={styles.dangerTitle}>Gestión de cuenta y sesión</h2>
        <p style={styles.dangerSubtitle}>Opciones de cierre de sesión y eliminación permanente de tu cuenta</p>

        <div style={styles.dangerActionsRow}>
          <button style={styles.logoutBtn} onClick={onLogout}>
            <LogOut size={20} />
            <span>Cerrar sesión</span>
          </button>

          <button style={styles.deleteAccountBtn} onClick={() => setIsDeleteModalOpen(true)}>
            <Trash2 size={20} />
            <span>Eliminar cuenta</span>
          </button>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="modal-overlay" onClick={() => setIsDeleteModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div style={styles.modalHeader}>
              <AlertTriangle size={36} color="#ef4444" />
              <h3 style={styles.modalTitle}>¿Eliminar tu cuenta?</h3>
            </div>
            <p style={styles.modalText}>
              Esta acción es permanente e irreversible. Se eliminarán todas tus rutinas, historiales y estadísticas asociadas a esta cuenta.
            </p>
            <div style={styles.modalActions}>
              <button style={styles.cancelModalBtn} onClick={() => setIsDeleteModalOpen(false)}>
                Cancelar
              </button>
              <button style={styles.confirmDeleteBtn} onClick={handleDeleteAccount}>
                Sí, eliminar cuenta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    padding: '2.5rem 3rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
    boxSizing: 'border-box',
  },
  pageTitle: {
    fontSize: '2.4rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
    marginBottom: '0.5rem',
  },
  card: {
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: '20px',
    padding: '2.25rem 2.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.75rem',
    width: '100%',
    boxSizing: 'border-box',
  },
  cardHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.85rem',
  },
  cardTitle: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  subtitle: {
    color: 'var(--text-muted)',
    fontSize: '1rem',
  },
  avatarSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.75rem',
  },
  avatarCircle: {
    width: '96px',
    height: '96px',
    borderRadius: '50%',
    backgroundColor: '#22f0c5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  avatarInitial: {
    fontSize: '2.2rem',
    fontWeight: 800,
    color: '#0f1417',
  },
  uploadControls: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  changePhotoBtn: {
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    padding: '0.65rem 1.35rem',
    borderRadius: '12px',
    fontWeight: 600,
    fontSize: '0.95rem',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.6rem',
    cursor: 'pointer',
    width: 'fit-content',
  },
  uploadHint: {
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    width: '100%',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '1.5rem',
    width: '100%',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
    width: '100%',
  },
  label: {
    fontSize: '1rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  input: {
    backgroundColor: 'var(--input-bg)',
    borderColor: 'var(--border-color)',
    borderRadius: '12px',
    padding: '0.95rem 1.15rem',
    fontSize: '1.05rem',
    color: 'var(--text-primary)',
    width: '100%',
    boxSizing: 'border-box',
  },
  textarea: {
    backgroundColor: 'var(--input-bg)',
    borderColor: 'var(--border-color)',
    borderRadius: '12px',
    padding: '1.15rem',
    fontSize: '1.05rem',
    color: 'var(--text-primary)',
    width: '100%',
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  successBanner: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    border: '1px solid rgba(34, 197, 94, 0.3)',
    color: 'var(--accent-green)',
    padding: '0.85rem 1.25rem',
    borderRadius: '12px',
    fontSize: '0.95rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: 'var(--danger-color)',
    padding: '0.85rem 1.25rem',
    borderRadius: '12px',
    fontSize: '0.95rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
  },
  saveRow: {
    marginTop: '0.5rem',
  },
  saveBtn: {
    backgroundColor: 'var(--accent-teal)',
    color: '#0b0f19',
    padding: '0.75rem 2rem',
    borderRadius: '12px',
    fontWeight: 700,
    fontSize: '1.05rem',
  },
  secSaveBtn: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
    padding: '0.75rem 2rem',
    borderRadius: '12px',
    fontWeight: 700,
    fontSize: '1.05rem',
  },
  dangerCard: {
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: '20px',
    padding: '2.25rem 2.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    width: '100%',
    boxSizing: 'border-box',
  },
  dangerTitle: {
    fontSize: '1.35rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  dangerSubtitle: {
    color: 'var(--text-muted)',
    fontSize: '0.95rem',
  },
  dangerActionsRow: {
    display: 'flex',
    gap: '1.25rem',
    marginTop: '0.5rem',
  },
  logoutBtn: {
    backgroundColor: 'rgba(37, 99, 235, 0.15)',
    border: '1px solid rgba(37, 99, 235, 0.3)',
    color: '#60a5fa',
    padding: '0.85rem 1.75rem',
    borderRadius: '14px',
    fontWeight: 700,
    fontSize: '1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
  },
  deleteAccountBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#ef4444',
    padding: '0.85rem 1.75rem',
    borderRadius: '14px',
    fontWeight: 700,
    fontSize: '1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
  },
  modalHeader: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.85rem',
    textAlign: 'center',
    marginBottom: '1rem',
  },
  modalTitle: {
    fontSize: '1.4rem',
    fontWeight: 800,
    color: '#E6EEF3',
  },
  modalText: {
    color: '#94a3b8',
    fontSize: '1rem',
    textAlign: 'center',
    lineHeight: 1.5,
    marginBottom: '1.75rem',
  },
  modalActions: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
  },
  cancelModalBtn: {
    padding: '0.85rem 1.5rem',
    borderRadius: '12px',
    color: '#94a3b8',
    fontWeight: 600,
    fontSize: '1rem',
  },
  confirmDeleteBtn: {
    backgroundColor: '#ef4444',
    color: '#ffffff',
    padding: '0.85rem 1.5rem',
    borderRadius: '12px',
    fontWeight: 700,
    fontSize: '1rem',
  },
};
