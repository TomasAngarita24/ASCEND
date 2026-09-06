import React, { lazy, Suspense, useEffect, useState } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api, type ActiveWorkout, type AuthSession, type RoutineDetail, type User } from './api/api';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { WorkoutSummaryModal, type WorkoutSummaryData } from './components/WorkoutSummaryModal';
import type { NavTab } from './components/Sidebar';
import { AuthView } from './views/AuthView';
import type { UserProfileCustomData } from './views/SettingsView';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { offlineQueue } from './utils/offlineQueue';

const HomeView = lazy(() => import('./views/HomeView').then((m) => ({ default: m.HomeView })));
const ActiveWorkoutView = lazy(() => import('./views/ActiveWorkoutView').then((m) => ({ default: m.ActiveWorkoutView })));
const ExerciseLibraryView = lazy(() => import('./views/ExerciseLibraryView').then((m) => ({ default: m.ExerciseLibraryView })));
const HistoryView = lazy(() => import('./views/HistoryView').then((m) => ({ default: m.HistoryView })));
const ProfileView = lazy(() => import('./views/ProfileView').then((m) => ({ default: m.ProfileView })));
const MeasurementsView = lazy(() => import('./views/MeasurementsView').then((m) => ({ default: m.MeasurementsView })));
const PlateCalculatorView = lazy(() => import('./views/PlateCalculatorView').then((m) => ({ default: m.PlateCalculatorView })));
const RoutinesView = lazy(() => import('./views/RoutinesView').then((m) => ({ default: m.RoutinesView })));
const RoutineEditorView = lazy(() => import('./components/RoutineEditorView').then((m) => ({ default: m.RoutineEditorView })));
const SettingsView = lazy(() => import('./views/SettingsView').then((m) => ({ default: m.SettingsView })));
const ResetPasswordView = lazy(() => import('./views/ResetPasswordView').then((m) => ({ default: m.ResetPasswordView })));

/** Maps NavTab ids to URL paths */
export const TAB_TO_PATH: Record<NavTab, string> = {
  'home': '/home',
  'routines': '/routines',
  'exercises': '/exercises',
  'active-workout': '/active-workout',
  'history': '/history',
  'profile': '/profile',
  'measurements': '/measurements',
  'plate-calculator': '/plate-calculator',
  'settings': '/settings',
};

/** Maps URL paths back to NavTab ids */
const PATH_TO_TAB: Record<string, NavTab> = Object.fromEntries(
  Object.entries(TAB_TO_PATH).map(([tab, path]) => [path, tab as NavTab]),
);

/** Tokens live in httpOnly cookies; these placeholders satisfy the type only. */
function makePlaceholderTokens(accessTokenExpiresAt: string): AuthSession['tokens'] {
  return { accessToken: '', refreshToken: '', accessTokenExpiresAt };
}

export function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const isOnline = useOnlineStatus();

  const [session, setSession] = useState<AuthSession | null>(null);
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkout | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  // Routine editor screen state (managed at App level so it renders as a full screen)
  const [routineEditorState, setRoutineEditorState] = useState<{
    isOpen: boolean;
    isNew: boolean;
    routineId: string | null;
    name: string;
    detail: RoutineDetail | null;
  }>({ isOpen: false, isNew: false, routineId: null, name: '', detail: null });

  // Shared profile data between ProfileView (display) and SettingsView (edit)
  const [profileData, setProfileData] = useState<UserProfileCustomData>({
    fullName: '',
    bio: '',
    avatarUrl: null,
    email: '',
  });

  // Workout celebration summary modal state
  const [completedSummary, setCompletedSummary] = useState<WorkoutSummaryData | null>(null);

  // Derive the active tab from the current URL path
  const activeTab: NavTab = PATH_TO_TAB[location.pathname] ?? 'home';

  // Navigate helper that replaces setActiveTab
  const navigateToTab = (tab: NavTab) => {
    navigate(TAB_TO_PATH[tab]);
  };

  // Registers the callback so api.ts can auto-logout when the session expires
  useEffect(() => {
    api.setSessionExpiredCallback(() => {
      handleLogout();
      toast.error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
    });
  }, []);

  // Process offline queue automatically when network is re-established
  useEffect(() => {
    if (isOnline) {
      offlineQueue.processQueue((syncedCount) => {
        toast.success(`⚡ Sincronización en la nube`, {
          description: `Se guardaron ${syncedCount} cambio${syncedCount > 1 ? 's' : ''} pendiente${syncedCount > 1 ? 's' : ''} en el servidor.`,
        });
      });
    }
  }, [isOnline]);

  // Restore saved session from localStorage and restore an in-progress workout
  useEffect(() => {
    const saved = localStorage.getItem('ascend_session');
    if (saved) {
      try {
        const parsed: { user?: User; expiresAt?: string; tokens?: AuthSession['tokens'] } = JSON.parse(saved);
        if (!parsed.user) {
          throw new Error('Sesión inválida');
        }
        // Tokens live in httpOnly cookies now; keep only user + expiry locally.
        const tokens = makePlaceholderTokens(parsed.tokens?.accessTokenExpiresAt ?? parsed.expiresAt ?? '');
        api.getProfile(tokens.accessToken)
          .then(async (user) => {
            setSession({ user, tokens });

            // Restore profileData
            const savedProfile = localStorage.getItem('ascend_profile');
            let initialProfile: UserProfileCustomData;
            if (savedProfile) {
              initialProfile = JSON.parse(savedProfile);
              if (user.fullName && !initialProfile.fullName) initialProfile.fullName = user.fullName;
              if (user.bio && !initialProfile.bio) initialProfile.bio = user.bio;
              if (user.avatarUrl && !initialProfile.avatarUrl) initialProfile.avatarUrl = user.avatarUrl;
              // If local has custom name/bio, sync to backend
              if ((initialProfile.fullName || initialProfile.bio) && (!user.fullName || !user.bio)) {
                api.updateProfile(tokens.accessToken, {
                  fullName: initialProfile.fullName,
                  bio: initialProfile.bio,
                  avatarUrl: initialProfile.avatarUrl,
                }).catch(() => {});
              }
            } else {
              const username = user.fullName || (user.email.includes('@') ? user.email.split('@')[0] : user.email);
              initialProfile = {
                fullName: username,
                bio: user.bio || '',
                avatarUrl: user.avatarUrl || null,
                email: user.email,
              };
            }
            setProfileData(initialProfile);

            // Restore active workout if one was in progress
            const savedWorkoutId = localStorage.getItem('ascend_active_workout_id');
            if (savedWorkoutId) {
              try {
                const detail = await api.getWorkout(tokens.accessToken, savedWorkoutId);
                // Only restore if still active (not completed or cancelled)
                const asActive = detail as unknown as ActiveWorkout;
                if (asActive.status === 'active' || asActive.status === 'in_progress') {
                  setActiveWorkout(asActive);
                  navigate('/active-workout', { replace: true });
                } else {
                  localStorage.removeItem('ascend_active_workout_id');
                }
              } catch {
                localStorage.removeItem('ascend_active_workout_id');
              }
            }
          })
          .catch(() => {
            localStorage.removeItem('ascend_session');
          })
          .finally(() => setLoadingSession(false));
        return;
      } catch {
        localStorage.removeItem('ascend_session');
      }
    }
    setLoadingSession(false);
  }, []);

  const handleAuthSuccess = (newSession: AuthSession) => {
    setSession(newSession);
    // Persist only non-sensitive data; tokens ride in httpOnly cookies.
    localStorage.setItem(
      'ascend_session',
      JSON.stringify({ user: newSession.user, expiresAt: newSession.tokens.accessTokenExpiresAt }),
    );
    const username = newSession.user.email.includes('@') ? newSession.user.email.split('@')[0] : newSession.user.email;
    const initial: UserProfileCustomData = { fullName: username, bio: '', avatarUrl: null, email: newSession.user.email };
    setProfileData(initial);
    localStorage.setItem('ascend_profile', JSON.stringify(initial));
    navigate('/home', { replace: true });
  };

  const handleUpdateProfileData = (data: Partial<UserProfileCustomData>) => {
    setProfileData((prev) => {
      const updated = { ...prev, ...data };
      localStorage.setItem('ascend_profile', JSON.stringify(updated));
      return updated;
    });
    if (session?.tokens.accessToken && (data.fullName !== undefined || data.bio !== undefined || data.avatarUrl !== undefined)) {
      api.updateProfile(session.tokens.accessToken, {
        fullName: data.fullName,
        bio: data.bio,
        avatarUrl: data.avatarUrl,
      }).catch(() => {});
    }
  };

  const handleLogout = () => {
    api.logout().catch(() => {});
    localStorage.removeItem('ascend_session');
    localStorage.removeItem('ascend_profile');
    localStorage.removeItem('ascend_active_workout_id');
    setSession(null);
    setActiveWorkout(null);
    setProfileData({ fullName: '', bio: '', avatarUrl: null, email: '' });
    navigate('/', { replace: true });
  };

  const handleStartWorkout = async (routineId?: string) => {
    if (!session) return;
    try {
      const workout = await api.startWorkout(session.tokens.accessToken, routineId);
      setActiveWorkout(workout);
      localStorage.setItem('ascend_active_workout_id', workout.id);
      navigate('/active-workout');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al iniciar el entrenamiento.');
    }
  };

  const handleFinishWorkout = (summary?: WorkoutSummaryData) => {
    setActiveWorkout(null);
    localStorage.removeItem('ascend_active_workout_id');
    if (summary) {
      setCompletedSummary(summary);
    } else {
      navigate('/history');
    }
  };

  // Password reset links arrive outside the authenticated app
  const isResetPath = location.pathname.startsWith('/reset-password');
  if (isResetPath) {
    return (
      <Suspense fallback={routeFallback}>
        <ResetPasswordView />
      </Suspense>
    );
  }

  if (loadingSession) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.spinner} />
        <span style={styles.loadingText}>Iniciando ASCEND...</span>
      </div>
    );
  }

  if (!session) {
    return <AuthView onSuccess={handleAuthSuccess} />;
  }

  return (
    <div style={styles.appLayout}>
      {/* Offline banner — fixed top bar when connectivity is lost */}
      {!isOnline && (
        <div style={offlineBannerStyle}>
          <span>⚡</span>
          <span>Sin conexión — los datos se sincronizarán al reconectarse</span>
        </div>
      )}

      {/* Left Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={navigateToTab}
        user={session.user}
        onLogout={handleLogout}
        hasActiveWorkout={activeWorkout !== null}
      />

      {/* Main Content Viewport */}
      <main className="mobile-main-content" style={styles.mainContent}>
        <Suspense fallback={routeFallback}>
          <Routes>
          {/* Default redirect: / → /home */}
          <Route path="/" element={<Navigate to="/home" replace />} />

          <Route
            path="/home"
            element={
              <HomeView
                tokens={session.tokens}
                onNavigate={navigateToTab}
                onStartWorkout={handleStartWorkout}
              />
            }
          />

          <Route
            path="/routines"
            element={
              routineEditorState.isOpen ? (
                <RoutineEditorView
                  tokens={session.tokens}
                  isNew={routineEditorState.isNew}
                  routineId={routineEditorState.routineId}
                  initialName={routineEditorState.name}
                  initialExercises={routineEditorState.detail?.exercises ?? []}
                  initialDetail={routineEditorState.detail}
                  onClose={() => setRoutineEditorState(s => ({ ...s, isOpen: false }))}
                  onSaved={() => setRoutineEditorState(s => ({ ...s, isOpen: false }))}
                />
              ) : (
                <RoutinesView
                  tokens={session.tokens}
                  onStartWorkout={handleStartWorkout}
                  onExplore={() => navigate('/exercises')}
                  onOpenEditor={(opts) => setRoutineEditorState({ ...opts, isOpen: true })}
                />
              )
            }
          />

          <Route
            path="/exercises"
            element={<ExerciseLibraryView tokens={session.tokens} />}
          />

          <Route
            path="/active-workout"
            element={
              activeWorkout ? (
                <ActiveWorkoutView
                  tokens={session.tokens}
                  workout={activeWorkout}
                  onFinished={handleFinishWorkout}
                />
              ) : (
                <div style={styles.noWorkoutContainer}>
                  <h2 style={styles.noWorkoutTitle}>Sin entrenamiento activo</h2>
                  <p style={styles.noWorkoutDesc}>Puedes iniciar un entrenamiento libre o seleccionar una rutina.</p>
                  <button style={styles.startEmptyBtn} onClick={() => handleStartWorkout()}>
                    Iniciar rutina vacía
                  </button>
                </div>
              )
            }
          />

          <Route
            path="/history"
            element={<HistoryView tokens={session.tokens} />}
          />

          <Route
            path="/profile"
            element={
              <ProfileView
                user={session.user}
                tokens={session.tokens}
                profileData={profileData}
                onNavigate={navigateToTab}
                onStartWorkout={handleStartWorkout}
              />
            }
          />

          <Route
            path="/measurements"
            element={<MeasurementsView tokens={session.tokens} />}
          />

          <Route
            path="/plate-calculator"
            element={<PlateCalculatorView />}
          />

          <Route
            path="/settings"
            element={
              <SettingsView
                user={session.user}
                tokens={session.tokens}
                profileData={profileData}
                onUpdateProfileData={handleUpdateProfileData}
                onLogout={handleLogout}
              />
            }
          />

          {/* Catch-all: redirect unknown paths to /home */}
          <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </Suspense>
      </main>

      {/* Bottom Navigation Bar for Mobile (< 768px) */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={navigateToTab}
        hasActiveWorkout={activeWorkout !== null}
      />

      {/* Workout Completion Celebration Modal */}
      {completedSummary && (
        <WorkoutSummaryModal
          isOpen={true}
          data={completedSummary}
          onClose={() => {
            setCompletedSummary(null);
            navigate('/history');
          }}
        />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  appLayout: {
    minHeight: '100vh',
    display: 'flex',
    backgroundColor: 'var(--bg-color)',
  },
  mainContent: {
    flex: 1,
    overflowY: 'auto',
    maxHeight: '100vh',
  },
  loadingScreen: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1rem',
    backgroundColor: 'var(--bg-color)',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid rgba(255, 255, 255, 0.08)',
    borderTopColor: 'var(--accent-teal)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    color: 'var(--text-muted)',
    fontSize: '0.95rem',
    fontWeight: 600,
  },
  noWorkoutContainer: {
    maxWidth: '600px',
    margin: '4rem auto',
    padding: '3rem 2rem',
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: '20px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
  },
  noWorkoutTitle: {
    fontSize: '1.5rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
  },
  noWorkoutDesc: {
    color: 'var(--text-muted)',
    fontSize: '0.95rem',
  },
  startEmptyBtn: {
    backgroundColor: 'var(--accent-blue)',
    color: '#ffffff',
    padding: '0.85rem 1.75rem',
    borderRadius: '12px',
    fontWeight: 700,
    fontSize: '0.95rem',
    marginTop: '0.5rem',
  },
};

const routeFallback = (
  <div style={styles.loadingScreen}>
    <div style={styles.spinner} />
  </div>
);

const offlineBannerStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  zIndex: 9999,
  backgroundColor: '#f59e0b',
  color: '#000000',
  textAlign: 'center',
  padding: '0.55rem 1rem',
  fontSize: '0.87rem',
  fontWeight: 700,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.5rem',
  letterSpacing: '-0.01em',
  boxShadow: '0 2px 12px rgba(245, 158, 11, 0.4)',
};
