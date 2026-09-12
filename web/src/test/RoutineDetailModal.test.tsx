import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

import { api, type RoutineDetail, type WorkoutExercise } from '../api/api';
import { RoutineDetailModal } from '../components/RoutineDetailModal';

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    dismiss: vi.fn(),
  }),
}));

import { toast } from 'sonner';

const routine: RoutineDetail = {
  id: 'routine-1',
  name: 'Push Day',
  folderId: null,
  isPublic: true,
  exercises: [
    {
      id: 'rex-1',
      exercise: { id: 'ex-1', name: 'Press Banca', mediaUrl: null, targetMuscleGroups: ['Chest'] },
      position: 1,
      restSeconds: 120,
      targetRepetitionsMin: 8,
      targetRepetitionsMax: 12,
      targetSets: 4,
      targetWeight: 80,
      notes: 'Controlar el descenso',
    },
  ],
};

const workout: WorkoutExercise[] = [
  {
    id: 'wex-1',
    position: 1,
    restSeconds: 120,
    exercise: { id: 'ex-1', name: 'Press Banca' },
    sets: [
      { id: 'set-1', setNumber: 1, weight: 80, repetitions: 10, rpe: null, setType: 'normal', isCompleted: true },
      { id: 'set-2', setNumber: 2, weight: 82.5, repetitions: 8, rpe: null, setType: 'normal', isCompleted: true },
      { id: 'set-3', setNumber: 3, weight: 80, repetitions: 5, rpe: null, setType: 'normal', isCompleted: false },
    ],
  },
];

function mockGetWorkoutRunner() {
  const runner = vi.fn();
  vi.spyOn(api, 'getWorkout').mockImplementation((workoutId: string) => {
    runner(workoutId);
    return Promise.resolve({ exercises: workout });
  });
  return runner;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('RoutineDetailModal', () => {
  it('shows a loading state while the routine is being fetched', () => {
    vi.spyOn(api, 'getRoutine').mockReturnValue(new Promise<RoutineDetail>(() => {}));

    render(<RoutineDetailModal routineId="routine-1" onClose={vi.fn()} />);

    expect(screen.getByText('Cargando ejercicios...')).toBeInTheDocument();
  });

  it('renders the routine exercises with their target configuration', async () => {
    vi.spyOn(api, 'getRoutine').mockResolvedValue(routine);

    render(<RoutineDetailModal routineId="routine-1" onClose={vi.fn()} />);

    expect(await screen.findByText('Push Day')).toBeInTheDocument();
    expect(screen.getByText('Compartida')).toBeInTheDocument();
    expect(screen.getByText('Press Banca')).toBeInTheDocument();
    expect(screen.getByText('4 series · 8-12 reps · 80 kg · descanso 120s')).toBeInTheDocument();
    expect(screen.getByText('Controlar el descenso')).toBeInTheDocument();
  });

  it('shows the performed-set chips when a linked workout is provided', async () => {
    vi.spyOn(api, 'getRoutine').mockResolvedValue(routine);
    const runner = mockGetWorkoutRunner();

    render(<RoutineDetailModal routineId="routine-1" workoutId="workout-1" onClose={vi.fn()} />);

    expect(await screen.findByText('Push Day')).toBeInTheDocument();
    expect(runner).toHaveBeenCalledWith('workout-1');
    expect(screen.getByText('Sesión publicada')).toBeInTheDocument();
    expect(screen.getByText('80 kg × 10')).toBeInTheDocument();
    expect(screen.getByText('82.5 kg × 8')).toBeInTheDocument();
    // The unfinished set is not rendered as performed.
    expect(screen.queryByText('80 kg × 5')).not.toBeInTheDocument();
  });

  it('copies the shared deep link to the clipboard', async () => {
    vi.spyOn(api, 'getRoutine').mockResolvedValue(routine);
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    render(<RoutineDetailModal routineId="routine-1" onClose={vi.fn()} />);
    await screen.findByText('Push Day');

    fireEvent.click(screen.getByLabelText('Copiar enlace de la rutina'));
    await act(async () => {});

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/r/routine-1`);
    expect(toast.success).toHaveBeenCalledWith('Enlace de la rutina copiado.');
  });

  it('reports an error when the routine cannot be loaded', async () => {
    vi.spyOn(api, 'getRoutine').mockRejectedValue(new Error('No se pudo cargar la rutina.'));

    render(<RoutineDetailModal routineId="missing" onClose={vi.fn()} />);

    expect(await screen.findByText('No se pudo cargar la rutina.')).toBeInTheDocument();
  });
});