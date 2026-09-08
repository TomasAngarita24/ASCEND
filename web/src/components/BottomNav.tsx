import React from 'react';
import {
  Home,
  Dumbbell,
  History,
  User,
  Flame,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { NavTab } from './Sidebar';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  hasActiveWorkout: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  hasActiveWorkout,
}) => {
  const items: Array<{ id: NavTab; label: string; Icon: LucideIcon; isWorkout?: boolean }> = [
    { id: 'home', label: 'Inicio', Icon: Home },
    { id: 'routines', label: 'Rutinas', Icon: Dumbbell },
    { id: 'active-workout', label: 'Entrenar', Icon: Flame, isWorkout: true },
    { id: 'history', label: 'Historial', Icon: History },
    { id: 'social', label: 'Social', Icon: Users },
    { id: 'profile', label: 'Perfil', Icon: User },
  ];

  return (
    <nav className="bottom-nav-container" aria-label="Navegación móvil">
      {items.map(({ id, label, Icon, isWorkout }) => {
        const isActive = activeTab === id;
        return (
          <button
            key={id}
            type="button"
            className={`bottom-nav-item ${isActive ? 'active' : ''} ${isWorkout && hasActiveWorkout ? 'workout-pulse' : ''}`}
            onClick={() => onTabChange(id)}
            title={label}
            aria-label={label}
          >
            <div className="bottom-nav-icon-wrap">
              <Icon
                size={22}
                color={isActive ? 'var(--accent-teal)' : isWorkout && hasActiveWorkout ? 'var(--accent-teal)' : 'var(--text-muted)'}
              />
              {isWorkout && hasActiveWorkout && <span className="bottom-nav-badge" />}
            </div>
            <span
              className="bottom-nav-label"
              style={{
                color: isActive ? 'var(--accent-teal)' : 'var(--text-muted)',
                fontWeight: isActive ? 700 : 500,
              }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
