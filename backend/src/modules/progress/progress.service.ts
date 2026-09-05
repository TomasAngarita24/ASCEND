import type { Prisma } from '../../generated/prisma/client';
import { prisma } from '../../database/prisma';
import { HttpError } from '../../errors/http-error';
import { estimateOneRepMax } from './one-rep-max';
import { getPersonalRecords } from './personal-record.service';
import type {
  EstimatedOneRepMaxResponse, ExerciseProgressionResponse, ProgressChartResponse, ProgressStatisticsResponse,
  MuscleGroupStatisticsResponse,
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

interface ProgressChartInput extends StatisticsInput {
  exerciseId?: string;
  metric: ProgressChartResponse['metric'];
}

function getWeekCount(dateFrom: Date, dateTo: Date): number {
  const millisecondsPerWeek = 7 * 24 * 60 * 60 * 1000;
  return Math.max(1, (dateTo.getTime() - dateFrom.getTime()) / millisecondsPerWeek);
}

function getWeekStart(date: Date): string {
  const weekStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const daysSinceMonday = (weekStart.getUTCDay() + 6) % 7;
  weekStart.setUTCDate(weekStart.getUTCDate() - daysSinceMonday);
  return weekStart.toISOString().slice(0, 10);
}

export async function getEstimatedOneRepMax(
  userId: string,
  exerciseId: string,
): Promise<EstimatedOneRepMaxResponse> {
  const exercise = await prisma.exercise.findFirst({
    where: {
      id: exerciseId,
      deletedAt: null,
      OR: [
        { createdByUserId: null },
        { createdByUserId: userId },
      ],
    },
    select: { id: true, name: true },
  });

  if (!exercise) {
    throw new HttpError(
      404,
      'EXERCISE_NOT_FOUND',
      'Exercise does not exist or is not accessible.',
    );
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

  const estimatedValues = sets.map((set) =>
    estimateOneRepMax(Number(set.weight), set.repetitions!),
  );

  const maximum =
    estimatedValues.length === 0 ? null : Math.max(...estimatedValues);

  return {
    exercise,
    estimatedOneRepMax:
      maximum === null ? null : Number(maximum.toFixed(2)),
  };
}

async function findAccessibleExercise(
  userId: string,
  exerciseId: string,
): Promise<{ id: string; name: string }> {
  const exercise = await prisma.exercise.findFirst({
    where: {
      id: exerciseId,
      deletedAt: null,
      OR: [
        { createdByUserId: null },
        { createdByUserId: userId },
      ],
    },
    select: { id: true, name: true },
  });

  if (!exercise) {
    throw new HttpError(
      404,
      'EXERCISE_NOT_FOUND',
      'Exercise does not exist or is not accessible.',
    );
  }

  return exercise;
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

  const completedSets = workouts.flatMap((workout) =>
    workout.workoutExercises.flatMap((exercise) => exercise.sets),
  );

  const totalRepetitions = completedSets.reduce(
    (total, set) => total + (set.repetitions ?? 0),
    0,
  );

  const totalVolume = completedSets.reduce(
    (total, set) =>
      total + Number(set.weight ?? 0) * (set.repetitions ?? 0),
    0,
  );

  const periodStart =
    input.dateFrom ?? workouts[0]?.startedAt ?? new Date();

  const periodEnd = input.dateTo ?? new Date();

  const personalRecords = await getPersonalRecords(userId);

  return {
    statistics: {
      totalWorkouts: workouts.length,
      workoutFrequency: Number(
        (
          workouts.length / getWeekCount(periodStart, periodEnd)
        ).toFixed(2),
      ),
      totalVolume,
      totalSets: completedSets.length,
      totalRepetitions,
      personalRecords: personalRecords.data.length,
    },
  };
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

export async function getProgressChart(
  userId: string,
  input: ProgressChartInput,
): Promise<ProgressChartResponse> {
  if (input.exerciseId) {
    const progression = await getExerciseProgression(userId, input.exerciseId, input);
    const data = progression.data.flatMap((point) => {
      if (input.metric === 'weight') {
        return point.weight === null ? [] : [{ date: point.date, value: point.weight }];
      }
      if (input.metric === 'volume') {
        return [{ date: point.date, value: point.volume }];
      }
      if (input.metric === 'repetitions') {
        return [{ date: point.date, value: point.repetitions }];
      }
      return [];
    });
    return { metric: input.metric, data };
  }

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
    },
    select: {
      completedAt: true,
      workoutExercises: {
        select: {
          sets: {
            where: { isCompleted: true },
            select: { repetitions: true, weight: true },
          },
        },
      },
    },
  });
  const valuesByWeek = new Map<string, number>();
  for (const workout of workouts) {
    if (!workout.completedAt) {
      continue;
    }
    const week = getWeekStart(workout.completedAt);
    const previousValue = valuesByWeek.get(week) ?? 0;
    if (input.metric === 'workout_frequency') {
      valuesByWeek.set(week, previousValue + 1);
      continue;
    }
    const volume = workout.workoutExercises
      .flatMap((exercise) => exercise.sets)
      .reduce((total, set) => total + Number(set.weight ?? 0) * (set.repetitions ?? 0), 0);
    valuesByWeek.set(week, previousValue + volume);
  }

  return {
    metric: input.metric,
    data: [...valuesByWeek.entries()]
      .map(([date, value]) => ({ date, value }))
      .sort((left, right) => left.date.localeCompare(right.date)),
  };
}

export async function getMuscleGroupStatistics(userId: string): Promise<MuscleGroupStatisticsResponse> {
  const workouts = await prisma.workout.findMany({
    where: { userId, status: 'completed' },
    select: {
      workoutExercises: {
        select: {
          exercise: { select: { targetMuscleGroups: true } },
          sets: {
            where: { isCompleted: true },
            select: { repetitions: true, weight: true },
          },
        },
      },
    },
  });
  const statistics = new Map<string, { trainingFrequency: number; volume: number }>();
  for (const workout of workouts) {
    const groupsInWorkout = new Set<string>();
    for (const workoutExercise of workout.workoutExercises) {
      if (workoutExercise.sets.length === 0) {
        continue;
      }
      const volume = workoutExercise.sets.reduce(
        (total, set) => total + Number(set.weight ?? 0) * (set.repetitions ?? 0),
        0,
      );
      for (const muscleGroup of workoutExercise.exercise.targetMuscleGroups) {
        const current = statistics.get(muscleGroup) ?? { trainingFrequency: 0, volume: 0 };
        current.volume += volume;
        statistics.set(muscleGroup, current);
        groupsInWorkout.add(muscleGroup);
      }
    }
    for (const muscleGroup of groupsInWorkout) {
      const current = statistics.get(muscleGroup)!;
      current.trainingFrequency += 1;
    }
  }

  return {
    data: [...statistics.entries()]
      .map(([muscleGroup, values]) => ({ muscleGroup, ...values }))
      .sort((left, right) => left.muscleGroup.localeCompare(right.muscleGroup)),
  };
}

 
