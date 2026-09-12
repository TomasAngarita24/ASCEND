import React, { useState, useRef, useEffect } from 'react';
import { User as UserIcon, Camera, LogOut, Trash2, Check, AlertTriangle, Shield, KeyRound, Mail, Sun, Moon, Download, FileJson, FileText, Upload, Bell, Clock3, Send, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import type { User as UserType, PushSettings } from '../api/api';
import { api } from '../api/api';
import { useTheme } from '../context/ThemeContext';
import { getActiveSubscription, subscribeToPush, unsubscribeFromPush } from '../utils/push';
import { useInstallPrompt } from '../hooks/useInstallPrompt';

function ToggleSwitch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      aria-label={label}
      role="switch"
      aria-checked={checked}
      style={{
        width: 56,
        height: 30,
        borderRadius: 999,
        backgroundColor: checked ? 'var(--accent-teal)' : '#e2e8f0',
        position: 'relative',
        transition: 'background-color 0.25s ease',
        flexShrink: 0,
        border: '2px solid var(--border-color)',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <span style={{
        position: 'absolute',
        top: 2,
        left: checked ? 28 : 2,
        width: 22,
        height: 22,
        borderRadius: '50%',
        backgroundColor: checked ? '#0b0f19' : '#ffffff',
        transition: 'left 0.25s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
      }} />
    </button>
  );
}

export interface UserProfileCustomData {
  fullName: string;
  bio: string;
  avatarUrl: string | null;
  email: string;
}

interface SettingsViewProps {
  user: UserType;
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
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isSavingSecurity, setIsSavingSecurity] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const installPrompt = useInstallPrompt();

  // Notifications state
  const [pushSettings, setPushSettings] = useState<PushSettings | null>(null);
  const [pushBusy, setPushBusy] = useState(false);
  const [reminderTime, setReminderTime] = useState('18:00');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const settings = await api.getPushSettings();
        if (cancelled) return;
        setPushSettings(settings);
        if (settings.reminderHour !== null && settings.reminderMinute !== null) {
          setReminderTime(
            `${String(settings.reminderHour).padStart(2, '0')}:${String(settings.reminderMinute).padStart(2, '0')}`,
          );
        }
      } catch {
        if (!cancelled) {
          setPushSettings({
            pushAvailable: false,
            subscribed: false,
            reminderEnabled: false,
            reminderHour: null,
            reminderMinute: null,
            reminderTzOffsetMin: 0,
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const tzOffsetMin = -new Date().getTimezoneOffset();

  const handleTogglePush = async (enabled: boolean) => {
    setPushBusy(true);
    try {
      if (enabled) {
        const subscription = await subscribeToPush();
        if (!subscription) {
          toast.error('No se pudieron activar las notificaciones.', {
            description: 'Acepta el permiso de notificaciones del navegador e inténtalo de nuevo.',
          });
          return;
        }
        await api.savePushSubscription(subscription.toJSON());
        toast.success('Notificaciones push activadas');
      } else {
        const subscription = await getActiveSubscription();
        if (subscription) {
          await api.deletePushSubscription(subscription.endpoint);
        }
        await unsubscribeFromPush();
        toast.success('Notificaciones push desactivadas');
      }
      setPushSettings(await api.getPushSettings());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No fue posible cambiar las notificaciones.');
    } finally {
      setPushBusy(false);
    }
  };

  const handleSaveReminder = async (enabled: boolean, time: string) => {
    if (!pushSettings) return;
    const [hour, minute] = time.split(':').map((part) => Number.parseInt(part, 10));
    try {
      const settings = await api.savePushSettings({
        reminderEnabled: enabled && pushSettings.subscribed,
        reminderHour: enabled ? hour : null,
        reminderMinute: enabled ? minute : null,
        reminderTzOffsetMin: tzOffsetMin,
      });
      setPushSettings(settings);
      toast.success(enabled ? 'Recordatorio diario activado' : 'Recordatorio diario desactivado');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No fue posible guardar el recordatorio.');
    }
  };

  const handleTestPush = async () => {
    setPushBusy(true);
    try {
      await api.sendTestPush();
      toast.success('Notificación de prueba enviada');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No fue posible enviar la notificación.');
    } finally {
      setPushBusy(false);
    }
  };

  const handleExport = async (format: 'csv' | 'json') => {
    setIsExporting(true);
    try {
      await api.exportWorkouts(format);
      toast.success(`Historial exportado como ${format.toUpperCase()} ✓`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al exportar los datos.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const res = await api.importWorkouts(json);
      toast.success(`¡Backup restaurado!`, {
        description: `Se importaron ${res.importedWorkouts} entrenamientos y ${res.importedSets} series exitosamente.`,
        duration: 5000,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al procesar el archivo de backup JSON.');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updateProfile({
        fullName: fullName.trim(),
        bio: bio.trim(),
        avatarUrl,
      });
      onUpdateProfileData({
        fullName: fullName.trim(),
        email: email.trim(),
        bio: bio.trim(),
        avatarUrl,
      });
      setSavedSuccess(true);
      toast.success('Perfil actualizado en la nube');
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar el perfil');
    }
  };

  const handleSaveSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecError(null);

    if (!newPassword) {
      setSecSuccess(true);
      setTimeout(() => setSecSuccess(false), 3000);
      return;
    }

    if (newPassword.length < 8) {
      setSecError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setSecError('La confirmación de la contraseña no coincide.');
      return;
    }
    if (!currentPassword) {
      setSecError('Ingresa tu contraseña actual para confirmar el cambio.');
      return;
    }

    setIsSavingSecurity(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      setSecSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      // Changing the password revokes every active session on the server, so
      // re-authentication is required and the current UI session is discarded.
      toast.success('Contraseña actualizada. Inicia sesión nuevamente.');
      onLogout();
    } catch (err) {
      setSecError(err instanceof Error ? err.message : 'No fue posible actualizar la contraseña.');
    } finally {
      setIsSavingSecurity(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten archivos de imagen.');
      e.target.value = '';
      return;
    }
    if (file.size > 250 * 1024) {
      toast.error('La imagen debe pesar menos de 250 KB.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setAvatarUrl(result);
      onUpdateProfileData({ avatarUrl: result });
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      await api.deleteAccount();
      toast.success('Cuenta eliminada. Gracias por usar ASCEND.');
      onLogout();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No fue posible eliminar la cuenta.');
      setIsDeletingAccount(false);
    }
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
            {theme === 'dark' ? <Moon size={24} color="var(--accent-teal)" /> : <Sun size={24} color="var(--accent-gold)" />}
            <h2 style={styles.cardTitle}>Apariencia</h2>
          </div>
          <p style={styles.subtitle}>Elige entre modo oscuro o claro según tu preferencia</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'var(--card-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {theme === 'dark' ? <Moon size={20} color="var(--accent-teal)" /> : <Sun size={20} color="var(--accent-gold)" />}
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
                : <Sun size={12} color="var(--accent-gold)" />}
            </span>
          </button>
        </div>
      </div>

      {/* Notifications Card */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div style={styles.titleRow}>
            <Bell size={24} color="var(--accent-teal)" />
            <h2 style={styles.cardTitle}>Notificaciones</h2>
          </div>
          <p style={styles.subtitle}>Avisos de fin de descanso y recordatorios de entrenamiento</p>
        </div>

        {pushSettings === null ? (
          <p style={styles.uploadHint}>Cargando preferencias…</p>
        ) : !pushSettings.pushAvailable ? (
          <div style={styles.errorBanner}>
            <AlertTriangle size={18} color="var(--accent-gold)" />
            <span>Las notificaciones no están disponibles en este momento.</span>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'var(--card-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bell size={20} color="var(--accent-teal)" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                    Notificaciones push
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Recibe el aviso de fin de descanso mientras entrenas
                  </div>
                </div>
              </div>
              <ToggleSwitch
                checked={pushSettings.subscribed}
                onChange={() => handleTogglePush(!pushSettings.subscribed)}
                disabled={pushBusy}
                label="Activar notificaciones push"
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'var(--card-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Clock3 size={20} color="var(--accent-gold)" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                    Recordatorio diario
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Te avisamos a una hora fija para que no te saltes el entrenamiento
                  </div>
                </div>
              </div>
              <ToggleSwitch
                checked={pushSettings.subscribed && pushSettings.reminderEnabled}
                onChange={() => handleSaveReminder(!pushSettings.reminderEnabled, reminderTime)}
                disabled={pushBusy || !pushSettings.subscribed}
                label="Activar recordatorio diario"
              />
            </div>

            {pushSettings.subscribed && pushSettings.reminderEnabled && (
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1rem', padding: '0.5rem 0' }}>
                <div style={styles.inputGroup}>
                  <label style={styles.label} htmlFor="reminder-time">
                    Hora del recordatorio
                  </label>
                  <input
                    id="reminder-time"
                    type="time"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    onBlur={() => handleSaveReminder(true, reminderTime)}
                    style={{ ...styles.input, width: 'auto' }}
                  />
                </div>
                <button
                  onClick={handleTestPush}
                  disabled={pushBusy}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.25rem',
                    borderRadius: 'var(--radius-container)',
                    backgroundColor: 'rgba(192, 138, 90, 0.12)',
                    border: '1px solid var(--accent-teal)',
                    color: 'var(--accent-teal)',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                  }}
                >
                  <Send size={16} />
                  <span>Enviar prueba</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Profile Information Card (100% Full Width) */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div style={styles.titleRow}>
            <UserIcon size={24} color="var(--text-primary)" />
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
            <span style={styles.uploadHint}>PNG o JPEG. Máx. 250 KB.</span>
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
                maxLength={255}
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
                readOnly
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
              maxLength={2000}
            />
          </div>

          {savedSuccess && (
            <div style={styles.successBanner}>
              <Check size={20} color="var(--accent-green)" />
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
            <Shield size={24} color="var(--text-primary)" />
            <h2 style={styles.cardTitle}>Seguridad de la cuenta</h2>
          </div>
          <p style={styles.subtitle}>Actualiza tu correo electrónico y tu contraseña de acceso</p>
        </div>

        <form onSubmit={handleSaveSecurity} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>
              <Mail size={16} style={{ display: 'inline', marginRight: '6px' }} />
              Correo electrónico
            </label>
            <input
              type="email"
              value={secEmail}
              onChange={(e) => setSecEmail(e.target.value)}
              style={styles.input}
              placeholder="tu@email.com"
              readOnly
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
              <AlertTriangle size={18} color="var(--danger-color)" />
              <span>{secError}</span>
            </div>
          )}

          {secSuccess && (
            <div style={styles.successBanner}>
              <Check size={20} color="var(--accent-green)" />
              <span>Credenciales de seguridad actualizadas correctamente.</span>
            </div>
          )}

          <div style={styles.saveRow}>
            <button type="submit" style={styles.secSaveBtn} disabled={isSavingSecurity}>
              {isSavingSecurity ? 'Actualizando...' : 'Actualizar seguridad'}
            </button>
          </div>
        </form>
      </div>

      {/* Export & Backup Card */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div style={styles.titleRow}>
            <Download size={24} color="var(--accent-teal)" />
            <h2 style={styles.cardTitle}>Exportación y copia de seguridad</h2>
          </div>
          <p style={styles.subtitle}>
            Descarga todo tu historial de entrenamientos, series, pesos y repeticiones. Tus datos te pertenecen.
          </p>
        </div>

        <div style={styles.exportContainer}>
          <div style={styles.exportInfoBox}>
            <span style={styles.exportInfoTitle}>¿Qué incluye la exportación?</span>
            <span style={styles.exportInfoDesc}>
              Fechas, horas de inicio y fin, duración, ejercicios realizados, número de serie, pesos en kg, repeticiones, RPE, notas y volumen total por serie de todos tus entrenamientos completados.
            </span>
          </div>

          <div style={styles.exportBtnGroup}>
            <button
              style={styles.exportCsvBtn}
              onClick={() => handleExport('csv')}
              disabled={isExporting}
            >
              <FileText size={18} />
              <span>{isExporting ? 'Exportando...' : 'Descargar Excel / CSV (.csv)'}</span>
            </button>

            <button
              style={styles.exportJsonBtn}
              onClick={() => handleExport('json')}
              disabled={isExporting || isImporting}
            >
              <FileJson size={18} />
              <span>{isExporting ? 'Exportando...' : 'Descargar Archivo JSON (.json)'}</span>
            </button>

            <button
              style={styles.importBtn}
              onClick={() => fileInputRef.current?.click()}
              disabled={isExporting || isImporting}
            >
              <Upload size={18} />
              <span>{isImporting ? 'Restaurando...' : 'Restaurar Backup (.json)'}</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleImportBackup}
            />
          </div>
        </div>
      </div>

      {installPrompt.canInstall && (
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.titleRow}>
              <Smartphone size={24} color="var(--accent-teal)" />
              <h2 style={styles.cardTitle}>Instala la app</h2>
            </div>
            <p style={styles.subtitle}>
              Añade ASCEND a tu pantalla de inicio y ábrela como una app nativa, con acceso rápido desde tu dispositivo.
            </p>
          </div>

          <div style={styles.exportBtnGroup}>
            <button
              style={styles.exportCsvBtn}
              onClick={() => {
                void installPrompt.install();
              }}
            >
              <Download size={18} />
              <span>Instalar app</span>
            </button>
          </div>
        </div>
      )}

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
              <AlertTriangle size={36} color="var(--danger-color)" />
              <h3 style={styles.modalTitle}>¿Eliminar tu cuenta?</h3>
            </div>
            <p style={styles.modalText}>
              Esta acción es permanente e irreversible. Se eliminarán todas tus rutinas, historiales y estadísticas asociadas a esta cuenta.
            </p>
            <div style={styles.modalActions}>
              <button style={styles.cancelModalBtn} onClick={() => setIsDeleteModalOpen(false)}>
                Cancelar
              </button>
              <button style={styles.confirmDeleteBtn} onClick={handleDeleteAccount} disabled={isDeletingAccount}>
                {isDeletingAccount ? 'Eliminando...' : 'Sí, eliminar cuenta'}
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
    padding: 'clamp(1.5rem, 4vw, 2.5rem) clamp(1rem, 5vw, 3rem)',
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
    borderRadius: 'var(--radius-container)',
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
    backgroundColor: 'var(--accent-teal)',
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
    color: 'var(--bg-color)',
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
    borderRadius: 'var(--radius-container)',
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
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
    borderRadius: 'var(--radius-container)',
    padding: '0.95rem 1.15rem',
    fontSize: '1.05rem',
    color: 'var(--text-primary)',
    width: '100%',
    boxSizing: 'border-box',
  },
  textarea: {
    backgroundColor: 'var(--input-bg)',
    borderColor: 'var(--border-color)',
    borderRadius: 'var(--radius-container)',
    padding: '1.15rem',
    fontSize: '1.05rem',
    color: 'var(--text-primary)',
    width: '100%',
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  successBanner: {
    backgroundColor: 'rgba(76, 175, 125, 0.15)',
    border: '1px solid rgba(76, 175, 125, 0.3)',
    color: 'var(--accent-green)',
    padding: '0.85rem 1.25rem',
    borderRadius: 'var(--radius-container)',
    fontSize: '0.95rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
  },
  errorBanner: {
    backgroundColor: 'rgba(192, 105, 105, 0.15)',
    border: '1px solid rgba(192, 105, 105, 0.3)',
    color: 'var(--danger-color)',
    padding: '0.85rem 1.25rem',
    borderRadius: 'var(--radius-container)',
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
    color: 'var(--bg-color)',
    padding: '0.75rem 2rem',
    borderRadius: 'var(--radius-container)',
    fontWeight: 700,
    fontSize: '1.05rem',
  },
  secSaveBtn: {
    backgroundColor: 'var(--accent-blue)',
    color: 'var(--bg-color)',
    padding: '0.75rem 2rem',
    borderRadius: 'var(--radius-container)',
    fontWeight: 700,
    fontSize: '1.05rem',
  },
  dangerCard: {
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-container)',
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
    backgroundColor: 'rgba(192, 138, 90, 0.15)',
    border: '1px solid rgba(192, 138, 90, 0.3)',
    color: 'var(--accent-gold)',
    padding: '0.85rem 1.75rem',
    borderRadius: 'var(--radius-container)',
    fontWeight: 700,
    fontSize: '1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
  },
  deleteAccountBtn: {
    backgroundColor: 'rgba(192, 105, 105, 0.15)',
    border: '1px solid rgba(192, 105, 105, 0.3)',
    color: 'var(--danger-color)',
    padding: '0.85rem 1.75rem',
    borderRadius: 'var(--radius-container)',
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
    color: 'var(--text-primary)',
  },
  modalText: {
    color: 'var(--text-muted)',
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
    borderRadius: 'var(--radius-container)',
    color: 'var(--text-muted)',
    fontWeight: 600,
    fontSize: '1rem',
  },
  confirmDeleteBtn: {
    backgroundColor: 'var(--danger-color)',
    color: 'var(--bg-color)',
    padding: '0.85rem 1.5rem',
    borderRadius: 'var(--radius-container)',
    fontWeight: 700,
    fontSize: '1rem',
  },
  exportContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  exportInfoBox: {
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-container)',
    padding: '1rem 1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
  },
  exportInfoTitle: {
    fontSize: '0.85rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  exportInfoDesc: {
    fontSize: '0.82rem',
    color: 'var(--text-muted)',
    lineHeight: 1.5,
  },
  exportBtnGroup: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  exportCsvBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    padding: '0.85rem 1.5rem',
    borderRadius: 'var(--radius-container)',
    backgroundColor: 'rgba(192, 138, 90, 0.12)',
    border: '1px solid var(--accent-teal)',
    color: 'var(--accent-teal)',
    fontWeight: 700,
    fontSize: '0.92rem',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease, transform 0.15s ease',
  },
  exportJsonBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    padding: '0.85rem 1.5rem',
    borderRadius: 'var(--radius-container)',
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    fontWeight: 700,
    fontSize: '0.92rem',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease, transform 0.15s ease',
  },
  importBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    padding: '0.85rem 1.5rem',
    borderRadius: 'var(--radius-container)',
    backgroundColor: 'rgba(192, 138, 90, 0.12)',
    border: '1px solid var(--accent-blue)',
    color: 'var(--accent-blue)',
    fontWeight: 700,
    fontSize: '0.92rem',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease, transform 0.15s ease',
  },
};
