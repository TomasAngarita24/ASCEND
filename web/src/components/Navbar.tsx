import React from 'react';
import { Dumbbell, BookOpen, Play, History, User, LogOut } from 'lucide-react';
import type { User as UserType } from '../api/api';

export type NavTab = 'routines' | 'exercises' | 'active-workout' | 'history' | 'profile';

interface NavbarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  user: UserType;
  onLogout: () => void;
  hasActiveWorkout: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  user,
  onLogout,
  hasActiveWorkout,
}) => {
  const username = user.email.includes('@') ? user.email.split('@')[0] : user.email;

  return (
    <header style={styles.header}>
      <div style={styles.container}>
        {/* Brand */}
        <div style={styles.brand} onClick={() => onTabChange('routines')}>
          <div style={styles.logoBadge}>
            <Dumbbell size={20} color="#22c55e" />
          </div>
          <span style={styles.brandName}>ASCEND</span>
        </div>

        {/* Nav Links */}
        <nav style={styles.nav}>
          <button
            style={{
              ...styles.navBtn,
              ...(activeTab === 'routines' ? styles.navBtnActive : {}),
            }}
            onClick={() => onTabChange('routines')}
          >
            <Dumbbell size={18} />
            <span>Rutinas</span>
          </button>

          <button
            style={{
              ...styles.navBtn,
              ...(activeTab === 'exercises' ? styles.navBtnActive : {}),
            }}
            onClick={() => onTabChange('exercises')}
          >
            <BookOpen size={18} />
            <span>Ejercicios</span>
          </button>

          <button
            style={{
              ...styles.navBtn,
              ...(activeTab === 'active-workout' ? styles.navBtnActive : {}),
              ...(hasActiveWorkout ? styles.navBtnPulse : {}),
            }}
            onClick={() => onTabChange('active-workout')}
          >
            <Play size={18} />
            <span>Entrenamiento</span>
            {hasActiveWorkout && <span style={styles.activeDot} />}
          </button>

          <button
            style={{
              ...styles.navBtn,
              ...(activeTab === 'history' ? styles.navBtnActive : {}),
            }}
            onClick={() => onTabChange('history')}
          >
            <History size={18} />
            <span>Historial</span>
          </button>

          <button
            style={{
              ...styles.navBtn,
              ...(activeTab === 'profile' ? styles.navBtnActive : {}),
            }}
            onClick={() => onTabChange('profile')}
          >
            <User size={18} />
            <span>Perfil</span>
          </button>
        </nav>

        {/* User Actions */}
        <div style={styles.userSection}>
          <div style={styles.userInfo} onClick={() => onTabChange('profile')}>
            <div style={styles.userAvatar}>{username.charAt(0).toUpperCase()}</div>
            <span style={styles.username}>{username}</span>
          </div>

          <button style={styles.logoutBtn} onClick={onLogout} title="Cerrar sesión">
            <LogOut size={18} color="#ef4444" />
          </button>
        </div>
      </div>
    </header>
  );
};

const styles: Record<string, React.CSSProperties> = {
  header: {
    backgroundColor: '#0f1417',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  container: {
    maxWidth: '1280px',
    margin: '0 auto',
    padding: '0 1.5rem',
    height: '64px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    cursor: 'pointer',
  },
  logoBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    padding: '0.5rem',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontSize: '1.25rem',
    fontWeight: 800,
    letterSpacing: '1px',
    color: '#E6EEF3',
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  navBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    borderRadius: '10px',
    color: '#94a3b8',
    fontSize: '0.9rem',
    fontWeight: 600,
    position: 'relative',
  },
  navBtnActive: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
  },
  navBtnPulse: {
    borderColor: '#22c55e',
  },
  activeDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#22c55e',
    marginLeft: '4px',
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    cursor: 'pointer',
  },
  userAvatar: {
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    fontWeight: 700,
    fontSize: '0.9rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  username: {
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#E6EEF3',
  },
  logoutBtn: {
    padding: '0.5rem',
    borderRadius: '10px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};
