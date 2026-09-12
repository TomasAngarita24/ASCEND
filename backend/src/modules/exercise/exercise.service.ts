import type { Exercise, Prisma } from '../../generated/prisma/client';
import { prisma } from '../../database/prisma';
import { HttpError } from '../../errors/http-error';
import type { ExerciseListResponse, ExerciseResponse, PreviousPerformanceResponse } from './exercise.types';

interface CreateExerciseInput {
  description?: string;
  equipment?: string;
  instructions?: string;
  name: string;
  targetMuscleGroups?: string[];
}

interface UpdateExerciseInput {
  description?: string | null;
  equipment?: string | null;
  instructions?: string | null;
  mediaUrl?: string | null;
  name?: string;
  targetMuscleGroups?: string[];
}

interface ListExerciseInput {
  equipment?: string;
  limit: number;
  muscleGroup?: string;
  page: number;
  query?: string;
}

function toExerciseResponse(exercise: Exercise, includeDetails = false): ExerciseResponse {
  const baseResponse: ExerciseResponse = {
    id: exercise.id,
    name: exercise.name,
    targetMuscleGroups: exercise.targetMuscleGroups,
    equipment: exercise.equipment,
    description: exercise.description,
    mediaUrl: exercise.mediaUrl,
    isCustom: exercise.createdByUserId !== null,
  };

  if (!includeDetails) {
    return baseResponse;
  }

  return {
    ...baseResponse,
    instructions: exercise.instructions,
    createdAt: exercise.createdAt.toISOString(),
    updatedAt: exercise.updatedAt.toISOString(),
  };
}

function visibleTo(userId: string): Prisma.ExerciseWhereInput {
  return {
    AND: [
      {
        OR: [
          { createdByUserId: null },
          { createdByUserId: userId },
        ],
      },
      { deletedAt: null },
    ],
  };
}

export async function createCustomExercise(
  userId: string,
  input: CreateExerciseInput,
): Promise<ExerciseResponse> {
  const targetGroups = input.targetMuscleGroups ?? [];
  const exercise = await prisma.exercise.create({
    data: {
      createdByUserId: userId,
      description: input.description,
      equipment: input.equipment,
      instructions: input.instructions,
      name: input.name,
      targetMuscleGroups: targetGroups,
      primaryMuscleGroups: targetGroups.length > 0 ? [targetGroups[0]] : [],
    },
  });

  return toExerciseResponse(exercise, true);
}

export async function updateCustomExercise(
  userId: string,
  exerciseId: string,
  input: UpdateExerciseInput,
): Promise<ExerciseResponse> {
  const existing = await prisma.exercise.findFirst({
    where: { id: exerciseId, createdByUserId: userId, deletedAt: null },
  });

  if (!existing) {
    throw new HttpError(404, 'EXERCISE_NOT_FOUND', 'Exercise does not exist or you do not have permission to modify it.');
  }

  const updated = await prisma.exercise.update({
    where: { id: exerciseId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.equipment !== undefined ? { equipment: input.equipment } : {}),
      ...(input.instructions !== undefined ? { instructions: input.instructions } : {}),
      ...(input.mediaUrl !== undefined ? { mediaUrl: input.mediaUrl } : {}),
      ...(input.targetMuscleGroups !== undefined
        ? {
            targetMuscleGroups: input.targetMuscleGroups,
            primaryMuscleGroups: input.targetMuscleGroups.length > 0 ? [input.targetMuscleGroups[0]] : [],
          }
        : {}),
    },
  });

  return toExerciseResponse(updated, true);
}

export async function deleteCustomExercise(
  userId: string,
  exerciseId: string,
): Promise<void> {
  const existing = await prisma.exercise.findFirst({
    where: { id: exerciseId, createdByUserId: userId, deletedAt: null },
  });

  if (!existing) {
    throw new HttpError(404, 'EXERCISE_NOT_FOUND', 'Exercise does not exist or you do not have permission to delete it.');
  }

  await prisma.exercise.update({
    where: { id: exerciseId },
    data: { deletedAt: new Date() },
  });
}

export async function getExercise(userId: string, exerciseId: string): Promise<ExerciseResponse> {
  const exercise = await prisma.exercise.findFirst({
    where: {
      AND: [visibleTo(userId), { id: exerciseId }],
    },
  });

  if (!exercise) {
    throw new HttpError(404, 'EXERCISE_NOT_FOUND', 'Exercise does not exist or is not accessible.');
  }

  return toExerciseResponse(exercise, true);
}

export async function listExercises(
  userId: string,
  input: ListExerciseInput,
): Promise<ExerciseListResponse> {
  const filters: Prisma.ExerciseWhereInput = {
    AND: [
      visibleTo(userId),
      input.query
        ? { name: { contains: input.query, mode: 'insensitive' } }
        : {},
      input.muscleGroup
        ? {
            targetMuscleGroups: {
              hasSome: Array.from(new Set([
                input.muscleGroup,
                input.muscleGroup.toLowerCase(),
                input.muscleGroup.toUpperCase(),
                input.muscleGroup.charAt(0).toUpperCase() + input.muscleGroup.slice(1).toLowerCase(),
                input.muscleGroup.replace(/e/gi, 'é').replace(/i/gi, 'í').replace(/o/gi, 'ó').replace(/u/gi, 'ú'),
                input.muscleGroup.normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
              ])),
            },
          }
        : {},
      input.equipment
        ? input.equipment.toLowerCase() === 'ninguno'
          ? {
              OR: [
                { equipment: { equals: 'Ninguno', mode: 'insensitive' } },
                { equipment: null },
                { equipment: '' },
              ],
            }
          : { equipment: { equals: input.equipment, mode: 'insensitive' } }
        : {},
    ],
  };

  const [exercises, total] = await prisma.$transaction([
    prisma.exercise.findMany({
      orderBy: { name: 'asc' },
      skip: (input.page - 1) * input.limit,
      take: input.limit,
      where: filters,
    }),
    prisma.exercise.count({ where: filters }),
  ]);

  return {
    data: exercises.map((exercise) => toExerciseResponse(exercise)),
    pagination: {
      limit: input.limit,
      page: input.page,
      total,
    },
  };
}
export async function getFavoriteIds(userId: string): Promise<{ exerciseIds: string[] }> {
  const rows = await prisma.exerciseBookmark.findMany({
    where: { userId },
    select: { exerciseId: true },
    orderBy: { createdAt: 'asc' },
  });

  return { exerciseIds: rows.map((row) => row.exerciseId) };
}

export async function addExerciseFavorite(userId: string, exerciseId: string): Promise<void> {
  const exercise = await prisma.exercise.findFirst({
    where: { AND: [visibleTo(userId), { id: exerciseId }] },
    select: { id: true },
  });

  if (!exercise) {
    throw new HttpError(404, 'EXERCISE_NOT_FOUND', 'Exercise does not exist or is not accessible.');
  }

  await prisma.exerciseBookmark.upsert({
    where: { userId_exerciseId: { userId, exerciseId } },
    create: { userId, exerciseId },
    update: {},
  });
}

export async function removeExerciseFavorite(userId: string, exerciseId: string): Promise<void> {
  await prisma.exerciseBookmark.deleteMany({ where: { userId, exerciseId } });
}

export async function getPreviousPerformance(
  userId: string,
  exerciseId: string,
): Promise<PreviousPerformanceResponse> {
  const exercise = await prisma.exercise.findFirst({
    where: {
      id: exerciseId,
      OR: [
        { createdByUserId: null },
        { createdByUserId: userId },
      ],
    },
    select: { id: true },
  });

  if (!exercise) {
    throw new HttpError(404, 'EXERCISE_NOT_FOUND', 'Exercise does not exist or is not accessible.');
  }

  const workout = await prisma.workout.findFirst({
    where: {
      userId,
      status: 'completed',
      workoutExercises: { some: { exerciseId } },
    },
    include: {
      workoutExercises: {
        where: { exerciseId },
        include: { sets: { orderBy: { setNumber: 'asc' } } },
      },
    },
    orderBy: { completedAt: 'desc' },
  });

  if (!workout?.completedAt) {
    return { previousWorkout: null };
  }

  return {
    previousWorkout: {
      id: workout.id,
      completedAt: workout.completedAt.toISOString(),
      sets: workout.workoutExercises.flatMap((workoutExercise) =>
        workoutExercise.sets.map((set) => ({
          setNumber: set.setNumber,
          weight: set.weight === null ? null : Number(set.weight),
          repetitions: set.repetitions,
          rpe: set.rpe === null ? null : Number(set.rpe),
          setType: set.setType,
        })),
      ),
    },
  };
}