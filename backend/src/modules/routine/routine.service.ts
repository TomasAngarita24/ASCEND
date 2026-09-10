import type { Prisma, RoutineExercise } from '../../generated/prisma/client';
import { prisma } from '../../database/prisma';
import { HttpError } from '../../errors/http-error';
import type { RoutineExerciseResponse, RoutineResponse, RoutineSummary, RoutineFolderResponse } from './routine.types';

type RoutineWithExercises = Prisma.RoutineGetPayload<{
  include: { routineExercises: { include: { exercise: true }; orderBy: { position: 'asc' } } };
}>;

interface ExerciseConfiguration {
  notes?: string | null;
  position?: number;
  restSeconds?: number;
  targetRepetitionsMax?: number;
  targetRepetitionsMin?: number;
  targetSets?: number;
  targetWeight?: number;
}

function toRoutineExerciseResponse(item: RoutineExercise & { exercise: { id: string; name: string } }): RoutineExerciseResponse {
  return {
    id: item.id,
    position: item.position,
    targetSets: item.targetSets,
    targetRepetitionsMin: item.targetRepetitionsMin,
    targetRepetitionsMax: item.targetRepetitionsMax,
    targetWeight: item.targetWeight === null ? null : Number(item.targetWeight),
    restSeconds: item.restSeconds,
    notes: item.notes,
    exercise: { id: item.exercise.id, name: item.exercise.name },
  };
}

function toRoutineResponse(routine: RoutineWithExercises): RoutineResponse {
  return {
    id: routine.id,
    name: routine.name,
    folderId: routine.folderId,
    exercises: routine.routineExercises.map(toRoutineExerciseResponse),
    createdAt: routine.createdAt.toISOString(),
    updatedAt: routine.updatedAt.toISOString(),
  };
}

async function findRoutine(userId: string, routineId: string): Promise<RoutineWithExercises> {
  const routine = await prisma.routine.findFirst({
    where: { id: routineId, userId },
    include: { routineExercises: { include: { exercise: true }, orderBy: { position: 'asc' } } },
  });

  if (!routine) {
    throw new HttpError(404, 'ROUTINE_NOT_FOUND', 'Routine does not exist or is not accessible.');
  }

  return routine;
}

async function assertAccessibleExercise(userId: string, exerciseId: string): Promise<void> {
  const exercise = await prisma.exercise.findFirst({
    where: {
      id: exerciseId,
      OR: [{ createdByUserId: null }, { createdByUserId: userId }],
      deletedAt: null,
    },
    select: { id: true },
  });

  if (!exercise) {
    throw new HttpError(404, 'EXERCISE_NOT_FOUND', 'Exercise does not exist or is not accessible.');
  }
}

export async function listRoutines(userId: string): Promise<{ data: RoutineSummary[] }> {
  const routines = await prisma.routine.findMany({
    where: { userId },
    include: {
      _count: {
        select: {
          routineExercises: { where: { exercise: { deletedAt: null } } },
        },
      },
      routineExercises: {
        where: { exercise: { deletedAt: null } },
        select: {
          targetSets: true,
          exercise: {
            select: {
              primaryMuscleGroups: true,
              targetMuscleGroups: true,
            },
          },
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return {
    data: routines.map((routine) => {
      const muscleMap = new Map<string, number>();
      let totalSets = 0;

      for (const item of routine.routineExercises) {
        const sets = item.targetSets ?? 0;
        totalSets += sets;

        const primaryMuscle =
          (item.exercise.primaryMuscleGroups && item.exercise.primaryMuscleGroups.length > 0)
            ? item.exercise.primaryMuscleGroups[0]
            : (item.exercise.targetMuscleGroups && item.exercise.targetMuscleGroups.length > 0)
            ? item.exercise.targetMuscleGroups[0]
            : 'Otros';

        if (primaryMuscle && sets > 0) {
          muscleMap.set(primaryMuscle, (muscleMap.get(primaryMuscle) ?? 0) + sets);
        }
      }

      const muscleSets = Array.from(muscleMap.entries())
        .map(([muscleGroup, sets]) => ({ muscleGroup, sets }))
        .sort((a, b) => b.sets - a.sets);

      return {
        id: routine.id,
        name: routine.name,
        folderId: routine.folderId,
        exerciseCount: routine._count.routineExercises,
        totalSets,
        muscleSets,
        createdAt: routine.createdAt.toISOString(),
        updatedAt: routine.updatedAt.toISOString(),
      };
    }),
  };
}

export async function createRoutine(userId: string, name: string): Promise<RoutineResponse> {
  const routine = await prisma.routine.create({
    data: { name, userId },
    include: { routineExercises: { include: { exercise: true }, orderBy: { position: 'asc' } } },
  });

  return toRoutineResponse(routine);
}

interface RoutineSaveExercise {
  exerciseId: string;
  notes?: string | null;
  restSeconds?: number;
  targetRepetitionsMax?: number;
  targetRepetitionsMin?: number;
  targetSets?: number;
  targetWeight?: number;
}

interface RoutineSaveInput {
  id?: string;
  name: string;
  exercises: RoutineSaveExercise[];
}

export async function saveRoutine(userId: string, input: RoutineSaveInput): Promise<RoutineResponse> {
  const routineId = await prisma.$transaction(async (transaction) => {
    const exerciseIds = [...new Set(input.exercises.map((item) => item.exerciseId))];
    if (exerciseIds.length > 0) {
      const accessible = await transaction.exercise.count({
        where: {
          id: { in: exerciseIds },
          OR: [{ createdByUserId: null }, { createdByUserId: userId }],
          deletedAt: null,
        },
      });
      if (accessible !== exerciseIds.length) {
        throw new HttpError(404, 'EXERCISE_NOT_FOUND', 'One or more exercises do not exist or are not accessible.');
      }
    }

    let routineId: string;
    if (input.id) {
      const existing = await transaction.routine.findFirst({
        where: { id: input.id, userId },
        select: { id: true },
      });
      if (!existing) {
        throw new HttpError(404, 'ROUTINE_NOT_FOUND', 'Routine does not exist or is not accessible.');
      }
      await transaction.routineExercise.deleteMany({ where: { routineId: input.id } });
      await transaction.routine.update({ where: { id: input.id }, data: { name: input.name } });
      routineId = input.id;
    } else {
      const created = await transaction.routine.create({
        data: { name: input.name, userId },
        select: { id: true },
      });
      routineId = created.id;
    }

    if (input.exercises.length > 0) {
      await transaction.routineExercise.createMany({
        data: input.exercises.map((item, index) => ({
          routineId,
          exerciseId: item.exerciseId,
          position: index + 1,
          targetSets: item.targetSets ?? null,
          targetRepetitionsMin: item.targetRepetitionsMin ?? null,
          targetRepetitionsMax: item.targetRepetitionsMax ?? null,
          targetWeight: item.targetWeight ?? null,
          restSeconds: item.restSeconds ?? null,
          notes: item.notes ?? null,
        })),
      });
    }

    return routineId;
  });

  return getRoutine(userId, routineId);
}

export async function getRoutine(userId: string, routineId: string): Promise<RoutineResponse> {
  return toRoutineResponse(await findRoutine(userId, routineId));
}

export async function updateRoutine(userId: string, routineId: string, name: string): Promise<RoutineResponse> {
  await findRoutine(userId, routineId);
  const routine = await prisma.routine.update({
    where: { id: routineId },
    data: { name },
    include: { routineExercises: { include: { exercise: true }, orderBy: { position: 'asc' } } },
  });

  return toRoutineResponse(routine);
}

export async function deleteRoutine(userId: string, routineId: string): Promise<void> {
  await findRoutine(userId, routineId);
  await prisma.routine.delete({ where: { id: routineId } });
}

export async function duplicateRoutine(userId: string, routineId: string): Promise<RoutineResponse> {
  const source = await findRoutine(userId, routineId);
  const duplicate = await prisma.routine.create({
    data: {
      name: `${source.name} (Copy)`,
      userId,
      routineExercises: {
        create: source.routineExercises.map((item) => ({
          exerciseId: item.exerciseId,
          position: item.position,
          targetSets: item.targetSets,
          targetRepetitionsMin: item.targetRepetitionsMin,
          targetRepetitionsMax: item.targetRepetitionsMax,
          targetWeight: item.targetWeight,
          restSeconds: item.restSeconds,
          notes: item.notes,
        })),
      },
    },
    include: { routineExercises: { include: { exercise: true }, orderBy: { position: 'asc' } } },
  });

  return toRoutineResponse(duplicate);
}

export async function addRoutineExercise(
  userId: string,
  routineId: string,
  exerciseId: string,
  input: ExerciseConfiguration,
): Promise<RoutineExerciseResponse> {
  await findRoutine(userId, routineId);
  await assertAccessibleExercise(userId, exerciseId);

  const item = await prisma.$transaction(async (transaction) => {
    const count = await transaction.routineExercise.count({ where: { routineId } });
    const position = input.position ?? count + 1;

    if (position > count + 1) {
      throw new HttpError(400, 'VALIDATION_ERROR', 'Exercise position is outside the routine range.');
    }

    if (position <= count) {
      await transaction.routineExercise.updateMany({
        where: { routineId, position: { gte: position } },
        data: { position: { increment: 1 } },
      });
    }

    return transaction.routineExercise.create({
      data: { ...input, exerciseId, position, routineId },
      include: { exercise: { select: { id: true, name: true } } },
    });
  });

  return toRoutineExerciseResponse(item);
}

export async function updateRoutineExercise(
  userId: string,
  routineId: string,
  routineExerciseId: string,
  input: ExerciseConfiguration,
): Promise<RoutineExerciseResponse> {
  await findRoutine(userId, routineId);

  const updated = await prisma.$transaction(async (transaction) => {
    const item = await transaction.routineExercise.findFirst({
      where: { id: routineExerciseId, routineId },
      include: { exercise: { select: { id: true, name: true } } },
    });
    if (!item) {
      throw new HttpError(404, 'ROUTINE_EXERCISE_NOT_FOUND', 'Routine exercise does not exist or is not accessible.');
    }

    const minimum = input.targetRepetitionsMin ?? item.targetRepetitionsMin;
    const maximum = input.targetRepetitionsMax ?? item.targetRepetitionsMax;
    if (minimum !== null && maximum !== null && minimum > maximum) {
      throw new HttpError(400, 'VALIDATION_ERROR', 'Minimum repetitions cannot exceed maximum repetitions.');
    }

    if (input.position !== undefined && input.position !== item.position) {
      const count = await transaction.routineExercise.count({ where: { routineId } });
      if (input.position > count) {
        throw new HttpError(400, 'VALIDATION_ERROR', 'Exercise position is outside the routine range.');
      }
      if (input.position < item.position) {
        await transaction.routineExercise.updateMany({
          where: { routineId, position: { gte: input.position, lt: item.position } },
          data: { position: { increment: 1 } },
        });
      } else {
        await transaction.routineExercise.updateMany({
          where: { routineId, position: { gt: item.position, lte: input.position } },
          data: { position: { decrement: 1 } },
        });
      }
    }

    return transaction.routineExercise.update({
      where: { id: routineExerciseId },
      data: {
        ...(input.position !== undefined ? { position: input.position } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        ...(input.restSeconds !== undefined ? { restSeconds: input.restSeconds } : {}),
        ...(input.targetRepetitionsMax !== undefined ? { targetRepetitionsMax: input.targetRepetitionsMax } : {}),
        ...(input.targetRepetitionsMin !== undefined ? { targetRepetitionsMin: input.targetRepetitionsMin } : {}),
        ...(input.targetSets !== undefined ? { targetSets: input.targetSets } : {}),
        ...(input.targetWeight !== undefined ? { targetWeight: input.targetWeight } : {}),
      },
      include: { exercise: { select: { id: true, name: true } } },
    });
  });

  return toRoutineExerciseResponse(updated);
}

export async function deleteRoutineExercise(userId: string, routineId: string, routineExerciseId: string): Promise<void> {
  await findRoutine(userId, routineId);

  await prisma.$transaction(async (transaction) => {
    const item = await transaction.routineExercise.findFirst({ where: { id: routineExerciseId, routineId } });
    if (!item) {
      throw new HttpError(404, 'ROUTINE_EXERCISE_NOT_FOUND', 'Routine exercise does not exist or is not accessible.');
    }
    await transaction.routineExercise.delete({ where: { id: routineExerciseId } });
    await transaction.routineExercise.updateMany({
      where: { routineId, position: { gt: item.position } },
      data: { position: { decrement: 1 } },
    });
  });
}

export async function reorderRoutineExercises(userId: string, routineId: string, routineExerciseIds: string[]): Promise<RoutineResponse> {
  await findRoutine(userId, routineId);

  await prisma.$transaction(async (transaction) => {
    const items = await transaction.routineExercise.findMany({ where: { routineId }, select: { id: true } });
    const currentIds = new Set(items.map((item) => item.id));
    const requestedIds = new Set(routineExerciseIds);
    if (currentIds.size !== requestedIds.size || currentIds.size !== routineExerciseIds.length
      || [...currentIds].some((id) => !requestedIds.has(id))) {
      throw new HttpError(400, 'VALIDATION_ERROR', 'The reorder request must include every routine exercise exactly once.');
    }

    await Promise.all(routineExerciseIds.map((id, index) => transaction.routineExercise.update({
      where: { id },
      data: { position: -(index + 1) },
    })));
    await Promise.all(routineExerciseIds.map((id, index) => transaction.routineExercise.update({
      where: { id },
      data: { position: index + 1 },
    })));
  });

  return getRoutine(userId, routineId);
}

export async function listRoutineFolders(userId: string): Promise<{ data: RoutineFolderResponse[] }> {
  const folders = await prisma.routineFolder.findMany({
    where: { userId },
    include: {
      routines: { select: { id: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  return {
    data: folders.map((f) => ({
      id: f.id,
      name: f.name,
      routineIds: f.routines.map((r) => r.id),
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
    })),
  };
}

export async function createRoutineFolder(userId: string, name: string): Promise<RoutineFolderResponse> {
  const folder = await prisma.routineFolder.create({
    data: { userId, name: name.trim() },
    include: { routines: { select: { id: true } } },
  });

  return {
    id: folder.id,
    name: folder.name,
    routineIds: folder.routines.map((r) => r.id),
    createdAt: folder.createdAt.toISOString(),
    updatedAt: folder.updatedAt.toISOString(),
  };
}

export async function updateRoutineFolder(userId: string, folderId: string, name: string): Promise<RoutineFolderResponse> {
  const folder = await prisma.routineFolder.findFirst({ where: { id: folderId, userId } });
  if (!folder) {
    throw new HttpError(404, 'FOLDER_NOT_FOUND', 'Folder does not exist or is not accessible.');
  }

  const updated = await prisma.routineFolder.update({
    where: { id: folderId },
    data: { name: name.trim() },
    include: { routines: { select: { id: true } } },
  });

  return {
    id: updated.id,
    name: updated.name,
    routineIds: updated.routines.map((r) => r.id),
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  };
}

export async function deleteRoutineFolder(userId: string, folderId: string): Promise<void> {
  const folder = await prisma.routineFolder.findFirst({ where: { id: folderId, userId } });
  if (!folder) {
    throw new HttpError(404, 'FOLDER_NOT_FOUND', 'Folder does not exist or is not accessible.');
  }

  await prisma.routineFolder.delete({ where: { id: folderId } });
}

export async function setRoutineFolder(userId: string, routineId: string, folderId: string | null): Promise<RoutineResponse> {
  await findRoutine(userId, routineId);

  if (folderId) {
    const folder = await prisma.routineFolder.findFirst({ where: { id: folderId, userId } });
    if (!folder) {
      throw new HttpError(404, 'FOLDER_NOT_FOUND', 'Folder does not exist or is not accessible.');
    }
  }

  const updated = await prisma.routine.update({
    where: { id: routineId },
    data: { folderId },
    include: { routineExercises: { include: { exercise: true }, orderBy: { position: 'asc' } } },
  });

  return toRoutineResponse(updated);
}
