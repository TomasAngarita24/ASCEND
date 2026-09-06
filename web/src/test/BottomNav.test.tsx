import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { BottomNav } from '../components/BottomNav';

describe('BottomNav mobile navigation component', () => {
  it('renders all main navigation tab buttons', () => {
    render(
      <BottomNav
        activeTab="home"
        onTabChange={vi.fn()}
        hasActiveWorkout={false}
      />
    );

    expect(screen.getByText('Inicio')).toBeInTheDocument();
    expect(screen.getByText('Rutinas')).toBeInTheDocument();
    expect(screen.getByText('Entrenar')).toBeInTheDocument();
    expect(screen.getByText('Historial')).toBeInTheDocument();
    expect(screen.getByText('Perfil')).toBeInTheDocument();
  });

  it('triggers onTabChange when a tab is clicked', () => {
    const handleTabChange = vi.fn();
    render(
      <BottomNav
        activeTab="home"
        onTabChange={handleTabChange}
        hasActiveWorkout={true}
      />
    );

    const workoutBtn = screen.getByRole('button', { name: 'Entrenar' });
    fireEvent.click(workoutBtn);
    expect(handleTabChange).toHaveBeenCalledWith('active-workout');
  });
});
