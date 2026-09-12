import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

import { api, OfflineQueuedError, type ExerciseSummary } from '../api/api';
import { ExerciseLibraryView } from '../views/ExerciseLibraryView';

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

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({}),
}));

import { toast } from 'sonner';

const exercises: ExerciseSummary[] = [
  {
    id: 'ex-1',
    name: 'Press Banca',
    targetMuscleGroups: ['Pecho'],
    equipment: 'Barra',
    mediaUrl: null,
    isCustom: false,
  },
];

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(api, 'listExercises').mockResolvedValue(exercises);
  vi.spyOn(api, 'listWorkoutHistory').mockResolvedValue([]);
  vi.spyOn(api, 'listFavorites').mockResolvedValue([]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ExerciseLibraryView favorites', () => {
  it('keeps the optimistic toggle when the server enqueued the change offline', async () => {
    vi.spyOn(api, 'addExerciseFavorite').mockRejectedValue(new OfflineQueuedError());
    render(<ExerciseLibraryView />);

    await screen.findByText('Press Banca');
    fireEvent.click(screen.getByTitle('Agregar a favoritos'));
    await act(async () => {});

    expect(screen.getByTitle('Quitar de favoritos')).toBeInTheDocument();
    expect(screen.queryByTitle('Agregar a favoritos')).not.toBeInTheDocument();
    expect(toast.info).toHaveBeenCalledWith(expect.stringContaining('sincronizará'));
  });

  it('reverts the toggle and reports an error when the request fails online', async () => {
    vi.spyOn(api, 'addExerciseFavorite').mockRejectedValue(new Error('Network'));
    render(<ExerciseLibraryView />);

    await screen.findByText('Press Banca');
    fireEvent.click(screen.getByTitle('Agregar a favoritos'));
    await act(async () => {});

    expect(screen.queryByTitle('Quitar de favoritos')).not.toBeInTheDocument();
    expect(screen.getByTitle('Agregar a favoritos')).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith('No se pudo actualizar el favorito.');
  });
});