import { Router } from 'express';

import { asyncHandler } from '../../lib/async-handler';
import { authenticate } from '../auth/auth.middleware';
import {
  addWorkoutExercise, createSet, deleteSet, deleteWorkout, deleteWorkoutExercise, exportWorkoutHistory, getWorkout, importWorkoutHistory, listWorkoutHistory, reorderWorkoutExercises, startWorkout, transitionWorkout, updateSet,
} from './workout.service';
import {
  validateAddWorkoutExercise, validateCreateSet, validateImportWorkoutHistory, validateReorderWorkoutExercises,
  validateStartWorkout, validateUpdateSet, validateWorkoutHistory, validateWorkoutId,
} from './workout.validation';

export const workoutRouter = Router();

workoutRouter.use(authenticate);

workoutRouter.post('/', asyncHandler(async (request, response) => {
  const input = validateStartWorkout(request.body);
  response.status(201).json({ workout: await startWorkout(request.auth!.userId, input.routineId) });
}));

workoutRouter.get('/', asyncHandler(async (request, response) => {
  response.status(200).json(await listWorkoutHistory(request.auth!.userId, validateWorkoutHistory(request.query)));
}));

workoutRouter.get('/export', asyncHandler(async (request, response) => {
  const rows = await exportWorkoutHistory(request.auth!.userId);
  const format = request.query.format === 'csv' ? 'csv' : 'json';

  if (format === 'csv') {
    const headers = [
      'workoutId', 'date', 'startedAt', 'completedAt', 'durationSeconds',
      'exercise', 'setNumber', 'weight', 'repetitions', 'rpe', 'setType', 'notes', 'volume',
    ];
    const escape = (value: unknown): string => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replaceAll('"', '""')}"`
        : str;
    };
    const csvLines = [
      headers.join(','),
      ...rows.map((row) => headers.map((h) => escape(row[h as keyof typeof row])).join(',')),
    ];
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader('Content-Disposition', 'attachment; filename="ascend-historial.csv"');
    response.status(200).send(csvLines.join('\n'));
  } else {
    response.setHeader('Content-Disposition', 'attachment; filename="ascend-historial.json"');
    response.status(200).json({ exportedAt: new Date().toISOString(), totalRows: rows.length, data: rows });
  }
}));

workoutRouter.post('/import', asyncHandler(async (request, response) => {
  const input = validateImportWorkoutHistory(request.body);
  const result = await importWorkoutHistory(request.auth!.userId, input.data);
  response.status(200).json(result);
}));

workoutRouter.patch('/:workoutId/exercises/reorder', asyncHandler(async (request, response) => {
  const { exerciseIds } = validateReorderWorkoutExercises(request.body);
  const workout = await reorderWorkoutExercises(request.auth!.userId, validateWorkoutId(request.params.workoutId), exerciseIds);
  response.status(200).json({ workout });
}));

workoutRouter.get('/:workoutId', asyncHandler(async (request, response) => {
  response.status(200).json({ workout: await getWorkout(request.auth!.userId, validateWorkoutId(request.params.workoutId)) });
}));

workoutRouter.delete('/:workoutId', asyncHandler(async (request, response) => {
  await deleteWorkout(request.auth!.userId, validateWorkoutId(request.params.workoutId));
  response.status(204).send();
}));

for (const action of ['pause', 'resume', 'complete', 'cancel'] as const) {
  workoutRouter.post(`/:workoutId/${action}`, asyncHandler(async (request, response) => {
    response.status(200).json({ workout: await transitionWorkout(request.auth!.userId, validateWorkoutId(request.params.workoutId), action) });
  }));
}

workoutRouter.post('/:workoutId/exercises', asyncHandler(async (request, response) => {
  const input = validateAddWorkoutExercise(request.body);
  const workoutExercise = await addWorkoutExercise(request.auth!.userId, validateWorkoutId(request.params.workoutId), input.exerciseId, input);
  response.status(201).json({ workoutExercise });
}));

workoutRouter.delete('/:workoutId/exercises/:workoutExerciseId', asyncHandler(async (request, response) => {
  await deleteWorkoutExercise(request.auth!.userId, validateWorkoutId(request.params.workoutId), validateWorkoutId(request.params.workoutExerciseId));
  response.status(204).send();
}));

workoutRouter.post('/:workoutId/exercises/:workoutExerciseId/sets', asyncHandler(async (request, response) => {
  const input = validateCreateSet(request.body);
  const set = await createSet(request.auth!.userId, validateWorkoutId(request.params.workoutId), validateWorkoutId(request.params.workoutExerciseId), input);
  response.status(201).json({ set });
}));

workoutRouter.patch('/:workoutId/exercises/:workoutExerciseId/sets/:setId', asyncHandler(async (request, response) => {
  const input = validateUpdateSet(request.body);
  const set = await updateSet(
    request.auth!.userId, validateWorkoutId(request.params.workoutId), validateWorkoutId(request.params.workoutExerciseId), validateWorkoutId(request.params.setId), input,
  );
  response.status(200).json({ set });
}));

workoutRouter.delete('/:workoutId/exercises/:workoutExerciseId/sets/:setId', asyncHandler(async (request, response) => {
  await deleteSet(
    request.auth!.userId,
    validateWorkoutId(request.params.workoutId),
    validateWorkoutId(request.params.workoutExerciseId),
    validateWorkoutId(request.params.setId),
  );
  response.status(204).send();
}));
