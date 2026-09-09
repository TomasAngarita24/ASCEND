import type { Prisma, Workout, WorkoutExercise, WorkoutSet } from '../../generated/prisma/client';
import { prisma } from '../../database/prisma';
import { HttpError } from '../../errors/http-error';
import type { SetResponse, WorkoutExerciseResponse, WorkoutHistoryResponse, WorkoutResponse } from './workout.types';

type WorkoutWithExercises = Prisma.WorkoutGetPayload<{
  include: {
    workoutExercises: {
      include: { exercise: true; sets: true };
      orderBy: { position: 'asc' };
    };
  };
}>;

interface AddExerciseInput { position?: number }
interface SetInput {
  isCompleted?: boolean;
  notes?: string;
  repetitions?: number;
  rpe?: number;
  setNumber?: number;
  setType?: string;
  weight?: number;
}

interface WorkoutHistoryInput {
  dateFrom?: Date;
  dateTo?: Date;
  limit: number;
  page: number;
  status: 'completed' | 'cancelled';
}

function toSetResponse(item: WorkoutSet): SetResponse {
  return {
    id: item.id,
    setNumber: item.setNumber,
    weight: item.weight === null ? null : Number(item.weight),
    repetitions: item.repetitions,
    rpe: item.rpe === null ? null : Number(item.rpe),
    setType: item.setType,
    notes: item.notes,
    isCompleted: item.isCompleted,
    completedAt: item.completedAt?.toISOString() ?? null,
  };
}

function toWorkoutExerciseResponse(item: WorkoutExercise & { exercise: { id: string; name: string; mediaUrl: string | null }; sets: WorkoutSet[] }): WorkoutExerciseResponse {
  return {
    id: item.id,
    position: item.position,
    exercise: { id: item.exercise.id, name: item.exercise.name, mediaUrl: item.exercise.mediaUrl },
    sets: [...item.sets].sort((left, right) => left.setNumber - right.setNumber).map(toSetResponse),
  };
}

function toWorkoutResponse(workout: WorkoutWithExercises): WorkoutResponse {
  return {
    id: workout.id,
    routineId: workout.routineId,
    status: workout.status,
    startedAt: workout.startedAt.toISOString(),
    completedAt: workout.completedAt?.toISOString() ?? null,
    exercises: workout.workoutExercises.map(toWorkoutExerciseResponse),
  };
}

async function findWorkout(userId: string, workoutId: string): Promise<WorkoutWithExercises> {
  const workout = await prisma.workout.findFirst({
    where: { id: workoutId, userId },
    include: {
      workoutExercises: {
        include: { exercise: true, sets: true },
        orderBy: { position: 'asc' },
      },
    },
  });

  if (!workout) {
    throw new HttpError(404, 'WORKOUT_NOT_FOUND', 'Workout does not exist or is not accessible.');
  }

  return workout;
}

function assertActive(workout: Workout): void {
  if (workout.status !== 'active') {
    throw new HttpError(409, 'INVALID_WORKOUT_STATE', 'The requested operation requires an active workout.');
  }
}

function assertEditable(workout: Workout): void {
  if (workout.status !== 'active' && workout.status !== 'completed') {
    throw new HttpError(409, 'INVALID_WORKOUT_STATE', 'The requested operation requires an active or completed workout.');
  }
}

async function assertAccessibleExercise(userId: string, exerciseId: string): Promise<void> {
  const exercise = await prisma.exercise.findFirst({
    where: {
      id: exerciseId,
      OR: [
        { createdByUserId: null },
        { createdByUserId: userId },
      ],
      deletedAt: null,
    },
    select: { id: true },
  });

  if (!exercise) {
    throw new HttpError(404, 'EXERCISE_NOT_FOUND', 'Exercise does not exist or is not accessible.');
  }
}
export async function startWorkout(userId: string, routineId?: string): Promise<WorkoutResponse> {
  let routineExercises: Array<{ exerciseId: string; position: number }> = [];
  if (routineId) {
    const routine = await prisma.routine.findFirst({
      where: { id: routineId, userId },
      include: {
        routineExercises: {
          where: { exercise: { deletedAt: null } },
          orderBy: { position: 'asc' },
        },
      },
    });
    if (!routine) {
      throw new HttpError(404, 'ROUTINE_NOT_FOUND', 'Routine does not exist or is not accessible.');
    }
    routineExercises = routine.routineExercises.map(({ exerciseId, position }) => ({ exerciseId, position }));
  }

  const workout = await prisma.workout.create({
    data: {
      userId,
      routineId,
      workoutExercises: { create: routineExercises },
    },
    include: { workoutExercises: { include: { exercise: true, sets: true }, orderBy: { position: 'asc' } } },
  });
  return toWorkoutResponse(workout);
}

export async function getWorkout(userId: string, workoutId: string): Promise<WorkoutResponse> {
  return toWorkoutResponse(await findWorkout(userId, workoutId));
}

export async function listWorkoutHistory(userId: string, input: WorkoutHistoryInput): Promise<WorkoutHistoryResponse> {
  const startedAt: Prisma.DateTimeFilter = {};
  if (input.dateFrom) {
    startedAt.gte = input.dateFrom;
  }
  if (input.dateTo) {
    startedAt.lte = input.dateTo;
  }
  const where: Prisma.WorkoutWhereInput = {
    userId,
    status: input.status,
    ...(Object.keys(startedAt).length > 0 ? { startedAt } : {}),
  };
  const [workouts, total] = await prisma.$transaction([
    prisma.workout.findMany({
      where,
      include: { workoutExercises: { include: { sets: true } } },
      orderBy: { startedAt: 'desc' },
      skip: (input.page - 1) * input.limit,
      take: input.limit,
    }),
    prisma.workout.count({ where }),
  ]);

  return {
    data: workouts.map((workout) => {
      const completedSets = workout.workoutExercises.flatMap((item) => item.sets.filter((set) => set.isCompleted));
      const totalRepetitions = completedSets.reduce((totalValue, set) => totalValue + (set.repetitions ?? 0), 0);
      const totalVolume = completedSets.reduce((totalValue, set) => totalValue + Number(set.weight ?? 0) * (set.repetitions ?? 0), 0);
      return {
        id: workout.id,
        routineId: workout.routineId,
        status: workout.status,
        startedAt: workout.startedAt.toISOString(),
        completedAt: workout.completedAt?.toISOString() ?? null,
        durationSeconds: workout.completedAt === null
          ? null
          : Math.floor((workout.completedAt.getTime() - workout.startedAt.getTime()) / 1000),
        exerciseCount: workout.workoutExercises.length,
        setsCompleted: completedSets.length,
        totalRepetitions,
        totalVolume,
      };
    }),
    pagination: { page: input.page, limit: input.limit, total },
  };
}

export async function transitionWorkout(userId: string, workoutId: string, action: 'pause' | 'resume' | 'complete' | 'cancel'): Promise<WorkoutResponse> {
  const workout = await findWorkout(userId, workoutId);
  const expectedStatus = action === 'pause' ? 'active' : action === 'resume' ? 'paused' : undefined;
  if (expectedStatus && workout.status !== expectedStatus) {
    throw new HttpError(409, 'INVALID_WORKOUT_STATE', `The workout cannot be ${action}d from its current state.`);
  }
  if ((action === 'complete' || action === 'cancel') && !['active', 'paused'].includes(workout.status)) {
    throw new HttpError(409, 'INVALID_WORKOUT_STATE', 'The workout is already completed or cancelled.');
  }

  const status = action === 'pause' ? 'paused' : action === 'resume' ? 'active' : action === 'complete' ? 'completed' : 'cancelled';
  const updated = await prisma.workout.update({
    where: { id: workoutId },
    data: { status, completedAt: action === 'complete' ? new Date() : undefined },
    include: { workoutExercises: { include: { exercise: true, sets: true }, orderBy: { position: 'asc' } } },
  });
  return toWorkoutResponse(updated);
}

export async function addWorkoutExercise(userId: string, workoutId: string, exerciseId: string, input: AddExerciseInput): Promise<WorkoutExerciseResponse> {
  const workout = await findWorkout(userId, workoutId);
  assertActive(workout);
  await assertAccessibleExercise(userId, exerciseId);

  const item = await prisma.$transaction(async (transaction) => {
    const count = await transaction.workoutExercise.count({ where: { workoutId } });
    const position = input.position ?? count + 1;
    if (position > count + 1) {
      throw new HttpError(400, 'VALIDATION_ERROR', 'Exercise position is outside the workout range.');
    }
    if (position <= count) {
      await transaction.workoutExercise.updateMany({
        where: { workoutId, position: { gte: position } },
        data: { position: { increment: 1 } },
      });
    }
    return transaction.workoutExercise.create({
      data: { exerciseId, position, workoutId },
      include: { exercise: { select: { id: true, name: true, mediaUrl: true } }, sets: true },
    });
  });
  return toWorkoutExerciseResponse(item);
}

export async function deleteWorkoutExercise(userId: string, workoutId: string, workoutExerciseId: string): Promise<void> {
  const workout = await findWorkout(userId, workoutId);
  assertActive(workout);
  await prisma.$transaction(async (transaction) => {
    const item = await transaction.workoutExercise.findFirst({ where: { id: workoutExerciseId, workoutId } });
    if (!item) {
      throw new HttpError(404, 'WORKOUT_EXERCISE_NOT_FOUND', 'Workout exercise does not exist or is not accessible.');
    }
    await transaction.workoutExercise.delete({ where: { id: workoutExerciseId } });
    await transaction.workoutExercise.updateMany({
      where: { workoutId, position: { gt: item.position } },
      data: { position: { decrement: 1 } },
    });
  });
}

export async function createSet(userId: string, workoutId: string, workoutExerciseId: string, input: SetInput): Promise<SetResponse> {
  const workout = await findWorkout(userId, workoutId);
  assertEditable(workout);
  const item = await prisma.$transaction(async (transaction) => {
    const workoutExercise = await transaction.workoutExercise.findFirst({ where: { id: workoutExerciseId, workoutId } });
    if (!workoutExercise) {
      throw new HttpError(404, 'WORKOUT_EXERCISE_NOT_FOUND', 'Workout exercise does not exist or is not accessible.');
    }
    const count = await transaction.workoutSet.count({ where: { workoutExerciseId } });
    const setNumber = input.setNumber ?? count + 1;
    if (setNumber > count + 1) {
      throw new HttpError(400, 'VALIDATION_ERROR', 'Set number is outside the workout exercise range.');
    }
    if (setNumber <= count) {
      await transaction.workoutSet.updateMany({
        where: { workoutExerciseId, setNumber: { gte: setNumber } },
        data: { setNumber: { increment: 1 } },
      });
    }
    return transaction.workoutSet.create({
      data: { ...input, setNumber, completedAt: input.isCompleted ? new Date() : undefined, workoutExerciseId },
    });
  });
  return toSetResponse(item);
}

export async function updateSet(userId: string, workoutId: string, workoutExerciseId: string, setId: string, input: SetInput): Promise<SetResponse> {
  const workout = await findWorkout(userId, workoutId);
  assertEditable(workout);
  const existing = await prisma.workoutSet.findFirst({
    where: { id: setId, workoutExerciseId, workoutExercise: { workoutId } },
  });
  if (!existing) {
    throw new HttpError(404, 'SET_NOT_FOUND', 'Set does not exist or is not accessible.');
  }
  const item = await prisma.workoutSet.update({
    where: { id: setId },
    data: {
      ...input,
      completedAt: input.isCompleted === undefined ? undefined : input.isCompleted ? new Date() : null,
    },
  });
  return toSetResponse(item);
}

export async function deleteSet(userId: string, workoutId: string, workoutExerciseId: string, setId: string): Promise<void> {
  const workout = await findWorkout(userId, workoutId);
  assertEditable(workout);
  await prisma.$transaction(async (transaction) => {
    const existing = await transaction.workoutSet.findFirst({
      where: { id: setId, workoutExerciseId, workoutExercise: { workoutId } },
    });
    if (!existing) {
      throw new HttpError(404, 'SET_NOT_FOUND', 'Set does not exist or is not accessible.');
    }
    await transaction.workoutSet.delete({ where: { id: setId } });
    await transaction.workoutSet.updateMany({
      where: { workoutExerciseId, setNumber: { gt: existing.setNumber } },
      data: { setNumber: { decrement: 1 } },
    });
  });
}

export async function deleteWorkout(userId: string, workoutId: string): Promise<void> {
  await findWorkout(userId, workoutId);
  await prisma.workout.delete({ where: { id: workoutId } });
}

export async function exportWorkoutHistory(userId: string): Promise<ExportRow[]> {
  const workouts = await prisma.workout.findMany({
    where: { userId, status: 'completed' },
    include: {
      workoutExercises: {
        include: { exercise: true, sets: true },
        orderBy: { position: 'asc' },
      },
    },
    orderBy: { startedAt: 'asc' },
  });

  const rows: ExportRow[] = [];
  for (const workout of workouts) {
    const durationSeconds = workout.completedAt
      ? Math.floor((workout.completedAt.getTime() - workout.startedAt.getTime()) / 1000)
      : null;

    for (const we of workout.workoutExercises) {
      const completedSets = we.sets
        .filter((s) => s.isCompleted)
        .sort((a, b) => a.setNumber - b.setNumber);

      if (completedSets.length === 0) {
        rows.push({
          workoutId: workout.id,
          date: workout.startedAt.toISOString().slice(0, 10),
          startedAt: workout.startedAt.toISOString(),
          completedAt: workout.completedAt?.toISOString() ?? null,
          durationSeconds,
          exercise: we.exercise.name,
          setNumber: null,
          weight: null,
          repetitions: null,
          rpe: null,
          setType: null,
          notes: null,
          volume: null,
        });
      } else {
        for (const set of completedSets) {
          rows.push({
            workoutId: workout.id,
            date: workout.startedAt.toISOString().slice(0, 10),
            startedAt: workout.startedAt.toISOString(),
            completedAt: workout.completedAt?.toISOString() ?? null,
            durationSeconds,
            exercise: we.exercise.name,
            setNumber: set.setNumber,
            weight: set.weight === null ? null : Number(set.weight),
            repetitions: set.repetitions,
            rpe: set.rpe === null ? null : Number(set.rpe),
            setType: set.setType,
            notes: set.notes,
            volume:
              set.weight !== null && set.repetitions !== null
                ? Number(set.weight) * set.repetitions
                : null,
          });
        }
      }
    }
  }

  return rows;
}

export interface ExportRow {
  workoutId: string;
  date: string;
  startedAt: string;
  completedAt: string | null;
  durationSeconds: number | null;
  exercise: string;
  setNumber: number | null;
  weight: number | null;
  repetitions: number | null;
  rpe: number | null;
  setType: string | null;
  notes: string | null;
  volume: number | null;
}

export async function reorderWorkoutExercises(userId: string, workoutId: string, orderedExerciseIds: string[]): Promise<WorkoutResponse> {
  const workout = await findWorkout(userId, workoutId);
  assertActive(workout);

  await prisma.$transaction(
    orderedExerciseIds.map((workoutExerciseId, index) =>
      prisma.workoutExercise.update({
        where: { id: workoutExerciseId },
        data: { position: index + 1 },
      })
    )
  );

  return toWorkoutResponse(await findWorkout(userId, workoutId));
}

export interface ImportBackupPayload {
  exportedAt?: string;
  data: ExportRow[];
}

export async function importWorkoutHistory(userId: string, payload: ImportBackupPayload): Promise<{ importedWorkouts: number; importedSets: number }> {
  if (!payload || !Array.isArray(payload.data) || payload.data.length === 0) {
    throw new HttpError(400, 'INVALID_IMPORT_PAYLOAD', 'The backup file is empty or formatted incorrectly.');
  }

  // Group rows by original workoutId (or startedAt date if missing)
  const workoutGroups = new Map<string, ExportRow[]>();
  for (const row of payload.data) {
    const key = row.workoutId || `${row.date}_${row.startedAt}`;
    if (!workoutGroups.has(key)) {
      workoutGroups.set(key, []);
    }
    workoutGroups.get(key)!.push(row);
  }

  let importedWorkouts = 0;
  let importedSets = 0;

  for (const [, rows] of workoutGroups) {
    const firstRow = rows[0];
    const startedAt = new Date(firstRow.startedAt || firstRow.date);
    const completedAt = firstRow.completedAt ? new Date(firstRow.completedAt) : new Date(startedAt.getTime() + 3600000);

    // Group rows within workout by exercise name
    const exerciseGroups = new Map<string, ExportRow[]>();
    for (const row of rows) {
      const exName = row.exercise || 'Ejercicio Importado';
      if (!exerciseGroups.has(exName)) {
        exerciseGroups.set(exName, []);
      }
      exerciseGroups.get(exName)!.push(row);
    }

    // Create the workout
    const newWorkout = await prisma.workout.create({
      data: {
        userId,
        status: 'completed',
        startedAt,
        completedAt,
      },
    });
    importedWorkouts++;

    let exPosition = 1;
    for (const [exerciseName, setRows] of exerciseGroups) {
      // Find or create the exercise
      let exercise = await prisma.exercise.findFirst({
        where: {
          name: { equals: exerciseName, mode: 'insensitive' },
          OR: [{ createdByUserId: null }, { createdByUserId: userId }],
          deletedAt: null,
        },
      });

      if (!exercise) {
        exercise = await prisma.exercise.create({
          data: {
            name: exerciseName,
            createdByUserId: userId,
            targetMuscleGroups: ['other'],
            equipment: 'other',
          },
        });
      }

      const workoutExercise = await prisma.workoutExercise.create({
        data: {
          workoutId: newWorkout.id,
          exerciseId: exercise.id,
          position: exPosition++,
        },
      });

      let setNum = 1;
      for (const setRow of setRows) {
        await prisma.workoutSet.create({
          data: {
            workoutExerciseId: workoutExercise.id,
            setNumber: setRow.setNumber || setNum++,
            weight: setRow.weight !== null && setRow.weight !== undefined ? Number(setRow.weight) : null,
            repetitions: setRow.repetitions !== null && setRow.repetitions !== undefined ? Number(setRow.repetitions) : null,
            rpe: setRow.rpe !== null && setRow.rpe !== undefined ? Number(setRow.rpe) : null,
            setType: setRow.setType || 'normal',
            notes: setRow.notes || null,
            isCompleted: true,
            completedAt,
          },
        });
        importedSets++;
      }
    }
  }

  return { importedWorkouts, importedSets };
}
