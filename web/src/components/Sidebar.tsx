import React from 'react';
import {
  Home,
  Dumbbell,
  BookOpen,
  History,
  User,
  Settings,
  Ruler,
  Calculator,
  Flame,
  Users,
  type LucideIcon,
  Sun,
  Moon,
} from 'lucide-react';
import type { User as UserType } from '../api/api';
import { useTheme } from '../context/ThemeContext';

export type NavTab =
  | 'home'
  | 'routines'
  | 'exercises'
  | 'active-workout'
  | 'history'
  | 'profile'
  | 'measurements'
  | 'plate-calculator'
  | 'settings'
  | 'social';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  user: UserType;
  onLogout: () => void;
  hasActiveWorkout: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  user: _user,
  onLogout: _onLogout,
  hasActiveWorkout,
}) => {
  const { theme, toggleTheme } = useTheme();

  const navItems: Array<{ id: NavTab; label: string; Icon: LucideIcon; badge?: string }> = [
    { id: 'home', label: 'Inicio', Icon: Home },
    { id: 'routines', label: 'Rutinas', Icon: Dumbbell },
    { id: 'exercises', label: 'Biblioteca', Icon: BookOpen },
    { id: 'history', label: 'Historial', Icon: History },
    { id: 'social', label: 'Social', Icon: Users },
    { id: 'measurements', label: 'Medidas', Icon: Ruler },
    { id: 'plate-calculator', label: 'Calculadora', Icon: Calculator },
    { id: 'profile', label: 'Perfil', Icon: User },
    { id: 'settings', label: 'Ajustes', Icon: Settings },
  ];

  return (
    <aside className="desktop-sidebar" style={styles.sidebar}>
      {/* Brand Header Button */}
      <button
        type="button"
        style={styles.brandHeader}
        onClick={() => onTabChange('home')}
        title="Ir a inicio"
        aria-label="Ir a inicio"
      >
        <div style={styles.logoBadge}>
          <img src="/logo.png" alt="ASCEND" style={{ height: 28, width: 'auto', display: 'block' }} />
        </div>
        <div style={styles.brandTextWrapper}>
          <span style={styles.brandName}>ASCEND</span>
          <span style={styles.betaBadge}>PRO</span>
        </div>
      </button>

      {/* Active Workout Floating Alert Banner if ongoing */}
      {hasActiveWorkout && (
        <button
          style={styles.activeWorkoutBanner}
          onClick={() => onTabChange('active-workout')}
        >
          <div style={styles.activeWorkoutPulse} />
          <Flame size={18} color="var(--accent-teal)" />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: 1 }}>
            <span style={styles.activeWorkoutTitle}>Sesión en curso</span>
            <span style={styles.activeWorkoutSub}>Toca para volver</span>
          </div>
        </button>
      )}

      {/* Navigation Section */}
      <div style={styles.navSection}>
        <nav style={styles.navList}>
          {navItems.map(({ id, label, Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                style={{
                  ...styles.navItem,
                  ...(isActive ? styles.navItemActive : styles.navItemInactive),
                }}
                onClick={() => onTabChange(id)}
                aria-current={isActive ? 'page' : undefined}
              >
                <div style={{
                  ...styles.iconContainer,
                  ...(isActive ? styles.iconActive : styles.iconInactive),
                }}>
                  <Icon size={20} color={isActive ? 'var(--accent-teal)' : 'var(--text-muted)'} />
                </div>
                <span style={{
                  ...styles.navLabel,
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: isActive ? 700 : 500,
                }}>
                  {label}
                </span>

                {id === 'active-workout' && hasActiveWorkout && (
                  <span style={styles.activeDot} aria-hidden="true" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Controls */}
      <div style={styles.sidebarFooter}>
        <div style={styles.themeToggleRow}>
          <span style={styles.themeLabel}>Tema visual</span>
          <button
            onClick={toggleTheme}
            style={styles.themeBtn}
            title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {theme === 'dark' ? <Sun size={17} color="var(--accent-gold)" /> : <Moon size={17} color="var(--accent-blue)" />}
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
              {theme === 'dark' ? 'Oscuro' : 'Claro'}
            </span>
          </button>
        </div>

        <div style={styles.divider} />

        <div style={styles.copyright}>
          © 2026 ASCEND • Strength & Overload
        </div>
      </div>
    </aside>
  );
};

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: '270px',
    backgroundColor: 'var(--sidebar-bg)',
    borderRight: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    position: 'sticky',
    top: 0,
    flexShrink: 0,
    padding: '1.25rem 1rem 0.85rem',
    zIndex: 40,
    boxSizing: 'border-box',
  },
  brandHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.85rem',
    cursor: 'pointer',
    marginBottom: '1.75rem',
    padding: '0.35rem 0.5rem',
    background: 'none',
    border: 'none',
    outline: 'none',
    width: '100%',
    textAlign: 'left',
    borderRadius: 'var(--radius-element)',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    transition: 'transform 0.15s ease, opacity 0.15s ease',
  },
  logoBadge: {
    backgroundColor: 'var(--accent-teal-glow)',
    border: '1px solid var(--border-highlight)',
    width: '42px',
    height: '42px',
    borderRadius: 'var(--radius-element)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTextWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  brandName: {
    fontSize: '1.4rem',
    fontWeight: 800,
    letterSpacing: '-0.03em',
    color: 'var(--text-primary)',
  },
  betaBadge: {
    background: 'var(--accent-teal-glow)',
    color: 'var(--accent-teal)',
    border: '1px solid var(--border-highlight)',
    fontSize: '0.66rem',
    fontWeight: 800,
    padding: '0.14rem 0.45rem',
    borderRadius: 'var(--radius-element)',
    letterSpacing: '0.08em',
  },
  activeWorkoutBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-control)',
    background: 'var(--accent-teal-glow)',
    border: '1px solid var(--border-highlight)',
    marginBottom: '1.25rem',
    cursor: 'pointer',
    textAlign: 'left',
    position: 'relative',
    overflow: 'hidden',
    outline: 'none',
  },
  activeWorkoutPulse: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    backgroundColor: 'var(--accent-teal)',
    flexShrink: 0,
    marginLeft: 'auto',
    order: 3,
  },
  activeWorkoutTitle: {
    fontSize: '0.85rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  activeWorkoutSub: {
    fontSize: '0.72rem',
    color: 'var(--text-muted)',
  },
  navSection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    overflowY: 'auto',
  },
  navList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '0.6rem 0.85rem',
    gap: '0.85rem',
    borderRadius: 'var(--radius-control)',
    fontSize: '0.92rem',
    width: '100%',
    textAlign: 'left',
    position: 'relative',
    cursor: 'pointer',
    border: 'none',
    outline: 'none',
    userSelect: 'none',
    WebkitUserSelect: 'none',
  },
  navItemInactive: {
    backgroundColor: 'transparent',
  },
  navItemActive: {
    backgroundColor: 'var(--surface-elevated)',
    border: '1px solid var(--border-color)',
    padding: '0.6rem 0.85rem',
  },
  iconContainer: {
    width: '32px',
    height: '32px',
    borderRadius: 'var(--radius-element)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease, transform 0.15s ease',
    flexShrink: 0,
  },
  iconActive: {
    backgroundColor: 'var(--accent-teal-glow)',
  },
  iconInactive: {
    backgroundColor: 'transparent',
  },
  navLabel: {
    flex: 1,
    letterSpacing: '-0.01em',
  },
  activeDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: 'var(--accent-teal)',
    flexShrink: 0,
  },
  sidebarFooter: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    marginTop: 'auto',
    paddingTop: '0.5rem',
  },
  themeToggleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 0.5rem',
  },
  themeLabel: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    fontWeight: 600,
  },
  themeBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.45rem',
    padding: '0.35rem 0.65rem',
    borderRadius: 'var(--radius-control)',
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
  },
  divider: {
    height: '1px',
    backgroundColor: 'var(--border-subtle)',
  },
  copyright: {
    fontSize: '0.7rem',
    color: 'var(--text-dim)',
    textAlign: 'center',
    letterSpacing: '-0.01em',
    paddingBottom: '0.15rem',
  },
};
