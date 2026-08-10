import type { Prisma } from '../../generated/prisma/client';
import { prisma } from '../../database/prisma';
import { HttpError } from '../../errors/http-error';
import { estimateOneRepMax } from './one-rep-max';
import { getPersonalRecords } from './personal-record.service';
import type {
  EstimatedOneRepMaxResponse, ExerciseProgressionResponse, ProgressStatisticsResponse,
} from './progress.types';

interface StatisticsInput {
  dateFrom?: Date;
  dateTo?: Date;
}

interface ExerciseProgressionInput extends StatisticsInput {}

interface ProgressionPoint {
  date: string;
  estimatedOneRepMax: number | null;
  repetitions: number;
  volume: number;
  weight: number | null;
}

function getWeekCount(dateFrom: Date, dateTo: Date): number {
  const millisecondsPerWeek = 7 * 24 * 60 * 60 * 1000;
  return Math.max(1, (dateTo.getTime() - dateFrom.getTime()) / millisecondsPerWeek);
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

async function findAccessibleExercise(userId: string, exerciseId: string): Promise<{ id: string; name: string }> {
  const exercise = await prisma.exercise.findFirst({
    where: { id: exerciseId, OR: [{ createdByUserId: null }, { createdByUserId: userId }] },
    select: { id: true, name: true },
  });
  if (!exercise) {
    throw new HttpError(404, 'EXERCISE_NOT_FOUND', 'Exercise does not exist or is not accessible.');
  }
  return exercise;
}

export async function getExerciseProgression(
  userId: string,
  exerciseId: string,
  input: ExerciseProgressionInput,
): Promise<ExerciseProgressionResponse> {
  const exercise = await findAccessibleExercise(userId, exerciseId);
  const startedAt: Prisma.DateTimeFilter = {};
  if (input.dateFrom) {
    startedAt.gte = input.dateFrom;
  }
  if (input.dateTo) {
    startedAt.lte = input.dateTo;
  }
  const workouts = await prisma.workout.findMany({
    where: {
      userId,
      status: 'completed',
      ...(Object.keys(startedAt).length > 0 ? { startedAt } : {}),
      workoutExercises: { some: { exerciseId } },
    },
    select: {
      completedAt: true,
      workoutExercises: {
        where: { exerciseId },
        select: {
          sets: {
            where: { isCompleted: true },
            select: { repetitions: true, weight: true },
          },
        },
      },
    },
    orderBy: { completedAt: 'asc' },
  });
  const points = new Map<string, ProgressionPoint>();
  for (const workout of workouts) {
    if (!workout.completedAt) {
      continue;
    }
    const date = workout.completedAt.toISOString().slice(0, 10);
    const point = points.get(date) ?? {
      date,
      weight: null,
      repetitions: 0,
      volume: 0,
      estimatedOneRepMax: null,
    };
    for (const workoutExercise of workout.workoutExercises) {
      for (const set of workoutExercise.sets) {
        const repetitions = set.repetitions ?? 0;
        const weight = set.weight === null ? null : Number(set.weight);
        point.repetitions += repetitions;
        point.volume += (weight ?? 0) * repetitions;
        if (weight !== null) {
          point.weight = point.weight === null ? weight : Math.max(point.weight, weight);
          const estimatedOneRepMax = estimateOneRepMax(weight, repetitions);
          point.estimatedOneRepMax = point.estimatedOneRepMax === null
            ? estimatedOneRepMax
            : Math.max(point.estimatedOneRepMax, estimatedOneRepMax);
        }
      }
    }
    points.set(date, point);
  }

  return {
    exercise,
    data: [...points.values()].map((point) => ({
      ...point,
      estimatedOneRepMax: point.estimatedOneRepMax === null
        ? null
        : Number(point.estimatedOneRepMax.toFixed(2)),
    })),
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
  const personalRecords = await getPersonalRecords(userId);

  return {
    statistics: {
      totalWorkouts: workouts.length,
      workoutFrequency: Number((workouts.length / getWeekCount(periodStart, periodEnd)).toFixed(2)),
      totalVolume,
      totalSets: completedSets.length,
      totalRepetitions,
      personalRecords: personalRecords.data.length,
    },
  };
}
