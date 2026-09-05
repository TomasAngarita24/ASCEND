import React, { useEffect, useState } from 'react';
import { api, type ActiveWorkout, type AuthSession } from './api/api';
import { Sidebar, type NavTab } from './components/Sidebar';
import { HomeView } from './views/HomeView';
import { ActiveWorkoutView } from './views/ActiveWorkoutView';
import { AuthView } from './views/AuthView';
import { ExerciseLibraryView } from './views/ExerciseLibraryView';
import { HistoryView } from './views/HistoryView';
import { ProfileView } from './views/ProfileView';
import { MeasurementsView } from './views/MeasurementsView';
import { PlateCalculatorView } from './views/PlateCalculatorView';
import { RoutinesView } from './views/RoutinesView';
import { SettingsView, type UserProfileCustomData } from './views/SettingsView';

export function App() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkout | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  // Shared profile data between ProfileView (display) and SettingsView (edit)
  const [profileData, setProfileData] = useState<UserProfileCustomData>({
    fullName: '',
    bio: '',
    avatarUrl: null,
    email: '',
  });

  // Restore saved session from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('ascend_session');
    if (saved) {
      try {
        const parsed: AuthSession = JSON.parse(saved);
        api.getProfile(parsed.tokens.accessToken)
          .then((user) => {
            setSession({ user, tokens: parsed.tokens });
            // Initialize profileData from saved user info
            const savedProfile = localStorage.getItem('ascend_profile');
            if (savedProfile) {
              setProfileData(JSON.parse(savedProfile));
            } else {
              const username = user.email.includes('@') ? user.email.split('@')[0] : user.email;
              setProfileData({ fullName: username, bio: '', avatarUrl: null, email: user.email });
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
    localStorage.setItem('ascend_session', JSON.stringify(newSession));
    const username = newSession.user.email.includes('@') ? newSession.user.email.split('@')[0] : newSession.user.email;
    const initial: UserProfileCustomData = { fullName: username, bio: '', avatarUrl: null, email: newSession.user.email };
    setProfileData(initial);
    localStorage.setItem('ascend_profile', JSON.stringify(initial));
  };

  const handleUpdateProfileData = (data: Partial<UserProfileCustomData>) => {
    setProfileData((prev) => {
      const updated = { ...prev, ...data };
      localStorage.setItem('ascend_profile', JSON.stringify(updated));
      return updated;
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('ascend_session');
    localStorage.removeItem('ascend_profile');
    setSession(null);
    setActiveWorkout(null);
    setProfileData({ fullName: '', bio: '', avatarUrl: null, email: '' });
  };

  const handleStartWorkout = async (routineId?: string) => {
    if (!session) return;
    try {
      const workout = await api.startWorkout(session.tokens.accessToken, routineId);
      setActiveWorkout(workout);
      setActiveTab('active-workout');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al iniciar el entrenamiento.');
    }
  };

  const handleFinishWorkout = () => {
    setActiveWorkout(null);
    setActiveTab('history');
  };

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
      {/* Left Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        user={session.user}
        onLogout={handleLogout}
        hasActiveWorkout={activeWorkout !== null}
      />

      {/* Main Content Viewport */}
      <main style={styles.mainContent}>
        {activeTab === 'home' && (
          <HomeView
            tokens={session.tokens}
            onNavigate={setActiveTab}
            onStartWorkout={handleStartWorkout}
          />
        )}

        {activeTab === 'routines' && (
          <RoutinesView
            tokens={session.tokens}
            onStartWorkout={handleStartWorkout}
            onExplore={() => setActiveTab('exercises')}
          />
        )}

        {activeTab === 'exercises' && (
          <ExerciseLibraryView tokens={session.tokens} />
        )}

        {activeTab === 'active-workout' && (
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
        )}

        {activeTab === 'history' && (
          <HistoryView tokens={session.tokens} />
        )}

        {activeTab === 'profile' && (
          <ProfileView
            user={session.user}
            tokens={session.tokens}
            profileData={profileData}
            onNavigate={setActiveTab}
            onStartWorkout={handleStartWorkout}
          />
        )}

        {activeTab === 'measurements' && (
          <MeasurementsView />
        )}

        {activeTab === 'plate-calculator' && (
          <PlateCalculatorView />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            user={session.user}
            tokens={session.tokens}
            profileData={profileData}
            onUpdateProfileData={handleUpdateProfileData}
            onLogout={handleLogout}
          />
        )}
      </main>
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
    border: '3px solid rgba(255, 255, 255, 0.1)',
    borderTopColor: '#22f0c5',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: '0.95rem',
    fontWeight: 600,
  },
  noWorkoutContainer: {
    maxWidth: '600px',
    margin: '4rem auto',
    padding: '3rem 2rem',
    backgroundColor: '#0f1417',
    border: '1px solid rgba(255, 255, 255, 0.08)',
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
    color: '#E6EEF3',
  },
  noWorkoutDesc: {
    color: '#94a3b8',
    fontSize: '0.95rem',
  },
  startEmptyBtn: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
    padding: '0.85rem 1.75rem',
    borderRadius: '12px',
    fontWeight: 700,
    fontSize: '0.95rem',
    marginTop: '0.5rem',
  },
};
