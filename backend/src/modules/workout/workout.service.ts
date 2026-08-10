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

function toWorkoutExerciseResponse(item: WorkoutExercise & { exercise: { id: string; name: string }; sets: WorkoutSet[] }): WorkoutExerciseResponse {
  return {
    id: item.id,
    position: item.position,
    exercise: { id: item.exercise.id, name: item.exercise.name },
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

async function assertAccessibleExercise(userId: string, exerciseId: string): Promise<void> {
  const exercise = await prisma.exercise.findFirst({
    where: { id: exerciseId, OR: [{ createdByUserId: null }, { createdByUserId: userId }] },
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
      include: { routineExercises: { orderBy: { position: 'asc' } } },
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
      include: { exercise: { select: { id: true, name: true } }, sets: true },
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
  assertActive(workout);
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
  assertActive(workout);
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
