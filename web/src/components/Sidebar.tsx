import React from 'react';
import { Home, Dumbbell, BookOpen, History, User, Settings, Ruler, Calculator, type LucideIcon } from 'lucide-react';
import type { User as UserType } from '../api/api';

export type NavTab = 'home' | 'routines' | 'exercises' | 'active-workout' | 'history' | 'profile' | 'measurements' | 'plate-calculator' | 'settings';

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
  user,
  onLogout,
  hasActiveWorkout,
}) => {
  const username = user.email.includes('@') ? user.email.split('@')[0] : user.email;

  const navItems: Array<{ id: NavTab; label: string; Icon: LucideIcon }> = [
    { id: 'home', label: 'Inicio', Icon: Home },
    { id: 'routines', label: 'Entrenamientos', Icon: Dumbbell },
    { id: 'exercises', label: 'Biblioteca de ejerc...', Icon: BookOpen },
    { id: 'history', label: 'Historial', Icon: History },
    { id: 'measurements', label: 'Medidas', Icon: Ruler },
    { id: 'plate-calculator', label: 'Calculadora de discos', Icon: Calculator },
    { id: 'profile', label: 'Perfil', Icon: User },
    { id: 'settings', label: 'Ajustes', Icon: Settings },
  ];

  return (
    <aside style={styles.sidebar}>
      {/* Brand Header */}
      <div style={styles.brandHeader} onClick={() => onTabChange('home')}>
        <div style={styles.logoBadge}>
          <Dumbbell size={28} color="#22f0c5" />
        </div>
        <div style={styles.brandTextWrapper}>
          <span style={styles.brandName}>ASCEND</span>
          <span style={styles.betaBadge}>BETA</span>
        </div>
      </div>

      {/* Navigation Section */}
      <div style={styles.navSection}>
        <div style={styles.sectionLabel}>NAVEGACIÓN</div>

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
              >
                <Icon size={24} color={isActive ? '#22f0c5' : '#94a3b8'} />
                <span style={{ color: isActive ? '#22f0c5' : '#cbd5e1' }}>
                  {label}
                </span>
                {id === 'active-workout' && hasActiveWorkout && (
                  <span style={styles.activeDot} />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer */}
      <div style={styles.sidebarFooter}>
        <div style={styles.copyright}>
          © 2026 ASCEND. Todos los derechos reservados.
        </div>
      </div>
    </aside>
  );
};

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: '340px',
    backgroundColor: 'var(--sidebar-bg)',
    borderRight: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    position: 'sticky',
    top: 0,
    flexShrink: 0,
    padding: '2rem 1.75rem',
  },
  brandHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    cursor: 'pointer',
    marginBottom: '2.5rem',
  },
  logoBadge: {
    backgroundColor: 'rgba(34, 240, 197, 0.15)',
    padding: '0.75rem',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTextWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
  },
  brandName: {
    fontSize: '1.6rem',
    fontWeight: 800,
    letterSpacing: '1px',
    color: 'var(--text-primary)',
  },
  betaBadge: {
    backgroundColor: 'rgba(34, 240, 197, 0.2)',
    color: '#22f0c5',
    fontSize: '0.75rem',
    fontWeight: 800,
    padding: '0.2rem 0.5rem',
    borderRadius: '6px',
    letterSpacing: '0.5px',
  },
  navSection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  sectionLabel: {
    fontSize: '1.15rem',
    fontWeight: 'bold',
    color: 'var(--text-muted)',
    paddingLeft: '0.5rem',
  },
  navList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.65rem',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '0.95rem 1.75rem',
    gap: '1.25rem',
    borderRadius: '16px',
    fontSize: '1.1rem',
    fontWeight: 600,
    width: '100%',
    textAlign: 'left',
    position: 'relative',
    transition: 'all 0.15s ease-in-out',
    boxSizing: 'border-box',
    borderLeft: '6px solid transparent',
  },
  navItemInactive: {
    backgroundColor: 'transparent',
  },
  navItemActive: {
    backgroundColor: 'rgba(52,73,69,.7)',
    borderLeft: '6px solid #22f0c5',
  },
  activeDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: '#22f0c5',
    marginLeft: 'auto',
    boxShadow: '0 0 8px #22f0c5',
  },
  sidebarFooter: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
    marginTop: 'auto',
  },

  divider: {
    height: '1px',
    backgroundColor: 'var(--border-color)',
  },
  copyright: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    textAlign: 'center',
    lineHeight: 1.4,
  },
};
