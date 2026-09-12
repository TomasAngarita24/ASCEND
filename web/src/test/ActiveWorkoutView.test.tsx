import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

import { api, type ActiveWorkout } from '../api/api';
import { ActiveWorkoutView } from '../views/ActiveWorkoutView';

vi.mock('sonner', () => ({
  toast: Object.assign(
    vi.fn(() => ({ id: 'mock-toast', dismiss: vi.fn() })),
    {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
      message: vi.fn(),
      loading: vi.fn(),
      dismiss: vi.fn(),
    },
  ),
}));

vi.mock('../utils/audio', () => ({
  soundManager: {
    playRestFinishedChime: vi.fn(),
    playPRCelebrationFanfare: vi.fn(),
  },
}));

import { toast } from 'sonner';

const workout: ActiveWorkout = {
  id: 'workout-1',
  routineId: null,
  status: 'active',
  startedAt: new Date().toISOString(),
  completedAt: null,
  exercises: [
    {
      id: 'wex-1',
      position: 1,
      restSeconds: 90,
      exercise: { id: 'ex-1', name: 'Press Banca' },
      sets: [
        { id: 'set-1', setNumber: 1, weight: 80, repetitions: 10, rpe: null, setType: 'normal', isCompleted: false },
      ],
    },
  ],
};

function flush() {
  return act(async () => {});
}

function renderView() {
  const onFinished = vi.fn();
  render(<ActiveWorkoutView workout={workout} onFinished={onFinished} />);
  return onFinished;
}

beforeEach(() => {
  vi.spyOn(api, 'listWorkoutHistory').mockResolvedValue([]);
  vi.spyOn(api, 'getExerciseProgression').mockResolvedValue({ data: [], pagination: { page: 1, limit: 20, total: 0 } });
  vi.spyOn(api, 'scheduleRestPush').mockResolvedValue(undefined);
  vi.spyOn(api, 'cancelRestPush').mockResolvedValue(undefined);
  vi.spyOn(api, 'recordWorkoutSet').mockImplementation(
    async (_workoutId: string, _exerciseId: string, setId: string, input: Parameters<typeof api.recordWorkoutSet>[3]) => {
      const set = workout.exercises[0].sets.find((s) => s.id === setId)!;
      return { ...set, ...input };
    },
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ActiveWorkoutView rest timer', () => {
  it('starts a 90s rest countdown when a set is completed', async () => {
    renderView();
    await flush();

    fireEvent.click(screen.getByLabelText('Marcar serie como completada'));
    await flush();

    expect(await screen.findByText('TIEMPO DE DESCANSO')).toBeInTheDocument();
    expect(screen.getByText('1:30')).toBeInTheDocument();
  });

  it('pauses and resumes the rest countdown without firing the chime', async () => {
    const soundManager = await import('../utils/audio').then((m) => m.soundManager);
    renderView();
    await flush();

    fireEvent.click(screen.getByLabelText('Marcar serie como completada'));
    await flush();

    fireEvent.click(screen.getByTitle(/Pausar/));
    expect(screen.getByText('DESCANSO EN PAUSA')).toBeInTheDocument();
    expect(screen.getByTitle(/Reanudar/)).toBeInTheDocument();
    expect(api.cancelRestPush).toHaveBeenCalled();
    expect(soundManager.playRestFinishedChime).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTitle(/Reanudar/));
    expect(screen.getByText('TIEMPO DE DESCANSO')).toBeInTheDocument();
  });

  it('dismisses the rest countdown via Omitir', async () => {
    renderView();
    await flush();

    fireEvent.click(screen.getByLabelText('Marcar serie como completada'));
    await flush();

    fireEvent.click(screen.getByText('Omitir'));
    expect(screen.queryByText('TIEMPO DE DESCANSO')).not.toBeInTheDocument();
    expect(api.cancelRestPush).toHaveBeenCalled();
  });
});

describe('ActiveWorkoutView drop set suggestion', () => {
  it('suggests a reduced weight when cycling a set to drop_set', async () => {
    renderView();
    await flush();

    fireEvent.click(screen.getByTitle(/Serie Normal/));
    expect(screen.getByTitle(/Calentamiento/)).toBeInTheDocument();

    fireEvent.click(screen.getByTitle(/Calentamiento/));

    const toastCall = (toast as ReturnType<typeof vi.fn>).mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].toLowerCase().includes('drop set'),
    );
    expect(toastCall).toBeDefined();
    // 80 kg * 0.7 = 56 -> rounded to the nearest 2.5 kg step = 55 kg
    expect((toastCall![1] as { description: string }).description).toContain('55 kg');

    const action = (toastCall![1] as { action: { label: string; onClick: () => void } }).action;
    expect(action.label).toBe('Usar 55 kg');

    act(() => {
      action.onClick();
    });
    await flush();

    const weightInput = screen.getByDisplayValue('55');
    expect(weightInput).toBeInTheDocument();
  });
});

describe('ActiveWorkoutView coaching', () => {
  const detailWithHistory = (setsCompleted: number, weight: number, reps: number) => {
    vi.spyOn(api, 'listWorkoutHistory').mockResolvedValue([
      { id: 'w-x', routineId: null, status: 'completed', startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), durationSeconds: 600, exerciseCount: 1, setsCompleted, totalRepetitions: reps, totalVolume: weight * reps * 2 },
    ]);
    vi.spyOn(api, 'getWorkout').mockResolvedValue({
      id: 'w-x',
      startedAt: new Date().toISOString(),
      exercises: [
        {
          id: 'wex-x',
          position: 1,
          restSeconds: 60,
          exercise: { id: 'ex-1', name: 'Press Banca' },
          sets: Array.from({ length: setsCompleted }, (_, i) => ({
            id: `set-x-${i}`,
            setNumber: i + 1,
            weight,
            repetitions: reps,
            rpe: null,
            setType: 'normal',
            isCompleted: true,
          })),
        },
      ],
    });
  };

  it('shows a progressive overload suggestion and applies it', async () => {
    detailWithHistory(3, 80, 12);
    renderView();
    await flush();

    const chip = await screen.findByText('Sugerido: 82.5 kg');
    expect(chip).toBeInTheDocument();

    fireEvent.click(chip);
    await flush();

    expect(screen.getByDisplayValue('82.5')).toBeInTheDocument();
    expect(api.recordWorkoutSet).toHaveBeenCalled();
  });

  it('shows a deload warning for high weekly volume', async () => {
    detailWithHistory(12, 80, 10);
    renderView();
    await flush();

    await screen.findByText(/Deload/);
    expect(screen.getByText(/Deload \(12 series\/sem\)/)).toBeInTheDocument();
  });

  it('applies the suggestion by calling recordWorkoutSet with the suggested weight', async () => {
    detailWithHistory(2, 40, 15);
    renderView();
    await flush();

    const chip = await screen.findByText('Sugerido: 42.5 kg');
    fireEvent.click(chip);
    await flush();

    expect(api.recordWorkoutSet).toHaveBeenCalledWith('workout-1', 'wex-1', 'set-1', { weight: 42.5 });
  });
});