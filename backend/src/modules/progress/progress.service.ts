import type { Prisma } from '../../generated/prisma/client';
import { prisma } from '../../database/prisma';
import { HttpError } from '../../errors/http-error';
import type { EstimatedOneRepMaxResponse, ProgressStatisticsResponse } from './progress.types';

interface StatisticsInput {
  dateFrom?: Date;
  dateTo?: Date;
}

function getWeekCount(dateFrom: Date, dateTo: Date): number {
  const millisecondsPerWeek = 7 * 24 * 60 * 60 * 1000;
  return Math.max(1, (dateTo.getTime() - dateFrom.getTime()) / millisecondsPerWeek);
}

export function estimateOneRepMax(weight: number, repetitions: number): number {
  return weight * (1 + repetitions / 30);
}

export async function getEstimatedOneRepMax(
  userId: string,
  exerciseId: string,
): Promise<EstimatedOneRepMaxResponse> {
  const exercise = await prisma.exercise.findFirst({
    where: { id: exerciseId, OR: [{ createdByUserId: null }, { createdByUserId: userId }] },
    select: { id: true, name: true },
  });
  if (!exercise) {
    throw new HttpError(404, 'EXERCISE_NOT_FOUND', 'Exercise does not exist or is not accessible.');
  }
  const sets = await prisma.workoutSet.findMany({
    where: {
      isCompleted: true,
      weight: { not: null },
      repetitions: { not: null },
      workoutExercise: {
        exerciseId,
        workout: { userId, status: 'completed' },
      },
    },
    select: { repetitions: true, weight: true },
  });
  const estimatedValues = sets.map((set) => estimateOneRepMax(Number(set.weight), set.repetitions!));
  const maximum = estimatedValues.length === 0 ? null : Math.max(...estimatedValues);

  return {
    exercise,
    estimatedOneRepMax: maximum === null ? null : Number(maximum.toFixed(2)),
  };
}

export async function getStatistics(
  userId: string,
  input: StatisticsInput,
): Promise<ProgressStatisticsResponse> {
  const startedAt: Prisma.DateTimeFilter = {};
  if (input.dateFrom) {
    startedAt.gte = input.dateFrom;
  }
  if (input.dateTo) {
    startedAt.lte = input.dateTo;
  }
  const where: Prisma.WorkoutWhereInput = {
    userId,
    status: 'completed',
    ...(Object.keys(startedAt).length > 0 ? { startedAt } : {}),
  };
  const workouts = await prisma.workout.findMany({
    where,
    select: {
      startedAt: true,
      workoutExercises: {
        select: {
          sets: {
            where: { isCompleted: true },
            select: { repetitions: true, weight: true },
          },
        },
      },
    },
    orderBy: { startedAt: 'asc' },
  });
  const completedSets = workouts.flatMap((workout) => workout.workoutExercises.flatMap((exercise) => exercise.sets));
  const totalRepetitions = completedSets.reduce((total, set) => total + (set.repetitions ?? 0), 0);
  const totalVolume = completedSets.reduce(
    (total, set) => total + Number(set.weight ?? 0) * (set.repetitions ?? 0),
    0,
  );
  const periodStart = input.dateFrom ?? workouts[0]?.startedAt ?? new Date();
  const periodEnd = input.dateTo ?? new Date();

  return {
    statistics: {
      totalWorkouts: workouts.length,
      workoutFrequency: Number((workouts.length / getWeekCount(periodStart, periodEnd)).toFixed(2)),
      totalVolume,
      totalSets: completedSets.length,
      totalRepetitions,
      personalRecords: 0,
    },
  };
}
