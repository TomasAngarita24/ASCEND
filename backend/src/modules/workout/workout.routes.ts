import { Router } from 'express';

import { asyncHandler } from '../../lib/async-handler';
import { authenticate } from '../auth/auth.middleware';
import {
  addWorkoutExercise, createSet, deleteWorkoutExercise, getWorkout, listWorkoutHistory, startWorkout, transitionWorkout, updateSet,
} from './workout.service';
import {
  validateAddWorkoutExercise, validateCreateSet, validateStartWorkout, validateUpdateSet, validateWorkoutHistory, validateWorkoutId,
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

workoutRouter.get('/:workoutId', asyncHandler(async (request, response) => {
  response.status(200).json({ workout: await getWorkout(request.auth!.userId, validateWorkoutId(request.params.workoutId)) });
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
