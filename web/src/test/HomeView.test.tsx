import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import {
  api,
  type ProgressStatistics,
  type MuscleGroupStat,
  type WeeklyMuscleSetStat,
  type WorkoutHistoryEntry,
  type Tokens,
} from '../api/api';
import { HomeView } from '../views/HomeView';

const tokens: Tokens = {
  accessToken: 'fixture-access-token',
  refreshToken: 'fixture-refresh-token',
  accessTokenExpiresAt: '2099-01-01T00:00:00.000Z',
};

const stats: ProgressStatistics = {
  totalWorkouts: 12,
  workoutFrequency: 3,
  totalVolume: 125400,
  totalSets: 240,
  totalRepetitions: 1800,
  personalRecords: 9,
};

const muscleStats: MuscleGroupStat[] = [
  { muscleGroup: 'Pecho', trainingFrequency: 8, volume: 80000 },
  { muscleGroup: 'Dorsal', trainingFrequency: 6, volume: 45400 },
];

const weeklyMuscleSets: WeeklyMuscleSetStat[] = [
  {
    muscleGroup: 'Pecho',
    weeklySets: 16,
    weeklyVolume: 12000,
    dailySets: 5,
    dailyVolume: 4200,
    totalSets: 40,
    totalVolume: 80000,
    frequencyThisWeek: 2,
  },
  {
    muscleGroup: 'Dorsal',
    weeklySets: 8,
    weeklyVolume: 6000,
    dailySets: 4,
    dailyVolume: 3150,
    totalSets: 24,
    totalVolume: 45400,
    frequencyThisWeek: 1,
  },
];

const history: WorkoutHistoryEntry[] = [
  {
    id: 'fixture-workout-1',
    routineId: null,
    status: 'completed',
    startedAt: '2026-09-05T18:00:00.000Z',
    completedAt: '2026-09-05T19:00:00.000Z',
    durationSeconds: 3600,
    exerciseCount: 5,
    setsCompleted: 24,
    totalRepetitions: 150,
    totalVolume: 42000,
  },
];

/** Matches an element whose full rendered text equals `expected` (across child nodes). */
function byTextContent(expected: string) {
  return (_content: string, element: Element | null) =>
    element !== null && element.textContent?.replace(/\s+/g, ' ').trim() === expected;
}

function mockProgress(resolved: {
  statistics?: ProgressStatistics;
  muscleGroups?: MuscleGroupStat[];
  weekly?: { data: WeeklyMuscleSetStat[]; totalWeeklySets: number; totalDailySets: number };
  history?: WorkoutHistoryEntry[];
} = {}) {
  const spy = {
    statistics: vi.spyOn(api, 'getStatistics').mockResolvedValue(resolved.statistics ?? stats),
    muscleGroups: vi.spyOn(api, 'getMuscleGroupStatistics').mockResolvedValue(resolved.muscleGroups ?? muscleStats),
    weekly: vi.spyOn(api, 'getWeeklyMuscleSets').mockResolvedValue(
      resolved.weekly ?? { data: weeklyMuscleSets, totalWeeklySets: 24, totalDailySets: 9 },
    ),
    history: vi.spyOn(api, 'listWorkoutHistory').mockResolvedValue(resolved.history ?? history),
  };

  return spy;
}

function renderHome() {
  const onNavigate = vi.fn();
  const onStartWorkout = vi.fn();
  render(<HomeView tokens={tokens} onNavigate={onNavigate} onStartWorkout={onStartWorkout} />);
  return { onNavigate, onStartWorkout };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('HomeView dashboard', () => {
  it('shows a loading state while the progress requests are in flight', () => {
    vi.spyOn(api, 'getStatistics').mockReturnValue(new Promise<ProgressStatistics>(() => {}));
    vi.spyOn(api, 'getMuscleGroupStatistics').mockResolvedValue(muscleStats);
    vi.spyOn(api, 'getWeeklyMuscleSets').mockResolvedValue({ data: weeklyMuscleSets, totalWeeklySets: 24, totalDailySets: 9 });
    vi.spyOn(api, 'listWorkoutHistory').mockResolvedValue(history);

    renderHome();
    expect(screen.getByText('Cargando métricas...')).toBeInTheDocument();
  });

  it('renders the headline metrics from the mocked statistics payload, with the totals matching (case #6)', async () => {
    mockProgress();
    renderHome();

    expect(await screen.findByText('Panel de Rendimiento')).toBeInTheDocument();
    expect(screen.queryByText('Cargando métricas...')).not.toBeInTheDocument();

    expect(screen.getByText(`${stats.totalVolume.toLocaleString()} kg`)).toBeInTheDocument();
    expect(screen.getByText(stats.totalSets)).toBeInTheDocument();
    expect(screen.getByText(`${stats.totalRepetitions.toLocaleString()} repeticiones`)).toBeInTheDocument();
    expect(screen.getByText(stats.totalWorkouts)).toBeInTheDocument();
    expect(screen.getByText(`${stats.workoutFrequency} ses/sem prom.`)).toBeInTheDocument();
    expect(screen.getByText(stats.personalRecords)).toBeInTheDocument();
  });

  it('renders coherent weekly muscle sets and their totals from the mocked payload (case #6)', async () => {
    mockProgress();
    renderHome();

    expect(await screen.findByText('Series Semanales por Músculo')).toBeInTheDocument();
    expect(screen.getByText(/24 series esta semana/)).toBeInTheDocument();

    // Per-muscle weekly counts must match the payload.
    expect(screen.getByText(byTextContent('16 series'))).toBeInTheDocument();
    expect(screen.getByText(byTextContent('8 series'))).toBeInTheDocument();
    expect(screen.getByText('Óptimo')).toBeInTheDocument();
    expect(screen.getByText('Mantenimiento')).toBeInTheDocument();

    // Sum of the mocked weekly sets equals the badge shown in the card header.
    const sum = weeklyMuscleSets.reduce((acc, item) => acc + item.weeklySets, 0);
    expect(sum).toBe(24);

    // Muscle balance uses the muscle-groups payload.
    expect(screen.getAllByText('Pecho').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Dorsal').length).toBeGreaterThanOrEqual(1);
  });

  it('switches between weekly and daily muscle-set views', async () => {
    mockProgress();
    renderHome();

    await screen.findByText(/24 series esta semana/);

    fireEvent.click(screen.getByText('Diarias'));

    expect(screen.getByText('Series Diarias por Músculo')).toBeInTheDocument();
    expect(screen.getByText(/9 series hoy/)).toBeInTheDocument();
    expect(screen.getByText(byTextContent('5 series'))).toBeInTheDocument();
    expect(screen.getByText(byTextContent('4 series'))).toBeInTheDocument();
  });

  it('renders the recent-sessions card from the mocked workout history', async () => {
    mockProgress();
    renderHome();

    expect(await screen.findByText('Últimas Sesiones')).toBeInTheDocument();
    expect(screen.getByText(history[0].exerciseCount)).toBeInTheDocument();
    expect(screen.getByText(history[0].setsCompleted)).toBeInTheDocument();
    expect(screen.getByText(`${history[0].totalVolume.toLocaleString()} kg`)).toBeInTheDocument();
    expect(screen.getByText('Completado')).toBeInTheDocument();
  });

  it('falls back to muscle-group statistics when the weekly endpoint has no data', async () => {
    mockProgress({
      weekly: { data: [], totalWeeklySets: 0, totalDailySets: 0 },
    });
    renderHome();

    expect(await screen.findByText(/Aún no has registrado series esta semana/)).toBeInTheDocument();
    expect(screen.getByText(/0 series esta semana/)).toBeInTheDocument();
    // Fallback rows are derived from muscle stats, even with no weekly data.
    expect(screen.getAllByText('Pecho').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Dorsal').length).toBeGreaterThanOrEqual(1);
  });

  it('keeps rendering from the requests that succeeded when one progress endpoint rejects', async () => {
    vi.spyOn(api, 'getStatistics').mockRejectedValue(new Error('boom'));
    vi.spyOn(api, 'getMuscleGroupStatistics').mockResolvedValue(muscleStats);
    vi.spyOn(api, 'getWeeklyMuscleSets').mockRejectedValue(new Error('boom'));
    vi.spyOn(api, 'listWorkoutHistory').mockResolvedValue(history);

    renderHome();

    expect(await screen.findByText('Panel de Rendimiento')).toBeInTheDocument();
    // Dashboard is resilient: the successful requests still drive the UI.
    expect(screen.getByText('Balance Muscular')).toBeInTheDocument();
    expect(screen.getAllByText('Pecho').length).toBeGreaterThanOrEqual(1);
  });

  it('shows empty states when there is no progress data', async () => {
    mockProgress({
      statistics: {
        totalWorkouts: 0,
        workoutFrequency: 0,
        totalVolume: 0,
        totalSets: 0,
        totalRepetitions: 0,
        personalRecords: 0,
      },
      muscleGroups: [],
      weekly: { data: [], totalWeeklySets: 0, totalDailySets: 0 },
      history: [],
    });
    renderHome();

    expect(await screen.findByText('Completa entrenamientos para ver tus series por músculo')).toBeInTheDocument();
    expect(screen.getByText('Registra ejercicios para ver el balance entre grupos musculares')).toBeInTheDocument();
    expect(screen.getByText('No hay entrenamientos registrados recientemente.')).toBeInTheDocument();
  });
});