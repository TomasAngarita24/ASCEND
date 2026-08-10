import type { Exercise, Prisma } from '../../generated/prisma/client';
import { prisma } from '../../database/prisma';
import { HttpError } from '../../errors/http-error';
import type { ExerciseListResponse, ExerciseResponse } from './exercise.types';

interface CreateExerciseInput {
  description?: string;
  equipment?: string;
  instructions?: string;
  name: string;
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
    isCustom: exercise.createdByUserId !== null,
  };

  if (!includeDetails) {
    return baseResponse;
  }

  return {
    ...baseResponse,
    description: exercise.description,
    instructions: exercise.instructions,
    mediaUrl: exercise.mediaUrl,
    createdAt: exercise.createdAt.toISOString(),
    updatedAt: exercise.updatedAt.toISOString(),
  };
}

function visibleTo(userId: string): Prisma.ExerciseWhereInput {
  return {
    OR: [
      { createdByUserId: null },
      { createdByUserId: userId },
    ],
  };
}

export async function createCustomExercise(
  userId: string,
  input: CreateExerciseInput,
): Promise<ExerciseResponse> {
  const exercise = await prisma.exercise.create({
    data: {
      createdByUserId: userId,
      description: input.description,
      equipment: input.equipment,
      instructions: input.instructions,
      name: input.name,
      targetMuscleGroups: input.targetMuscleGroups ?? [],
    },
  });

  return toExerciseResponse(exercise, true);
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
        ? { targetMuscleGroups: { has: input.muscleGroup } }
        : {},
      input.equipment
        ? { equipment: { equals: input.equipment, mode: 'insensitive' } }
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
