import { Router } from 'express';

import { asyncHandler } from '../../lib/async-handler';
import { authenticate } from '../auth/auth.middleware';
import { createCustomExercise, deleteCustomExercise, getExercise, getPreviousPerformance, listExercises, updateCustomExercise } from './exercise.service';
import { validateCreateExercise, validateExerciseId, validateExerciseList, validateUpdateExercise } from './exercise.validation';

export const exerciseRouter = Router();

exerciseRouter.use(authenticate);

exerciseRouter.get('/', asyncHandler(async (request, response) => {
  const query = validateExerciseList(request.query);
  const result = await listExercises(request.auth!.userId, query);

  response.status(200).json(result);
}));

exerciseRouter.post('/', asyncHandler(async (request, response) => {
  const input = validateCreateExercise(request.body);
  const exercise = await createCustomExercise(request.auth!.userId, input);

  response.status(201).json({ exercise });
}));

exerciseRouter.put('/:exerciseId', asyncHandler(async (request, response) => {
  const exerciseId = validateExerciseId(request.params.exerciseId);
  const input = validateUpdateExercise(request.body);
  const exercise = await updateCustomExercise(request.auth!.userId, exerciseId, input);

  response.status(200).json({ exercise });
}));

exerciseRouter.delete('/:exerciseId', asyncHandler(async (request, response) => {
  const exerciseId = validateExerciseId(request.params.exerciseId);
  await deleteCustomExercise(request.auth!.userId, exerciseId);

  response.status(204).send();
}));

exerciseRouter.get('/:exerciseId/previous-performance', asyncHandler(async (request, response) => {
  const previousWorkout = await getPreviousPerformance(request.auth!.userId, validateExerciseId(request.params.exerciseId));
  response.status(200).json(previousWorkout);
}));

exerciseRouter.get('/:exerciseId', asyncHandler(async (request, response) => {
  const exerciseId = validateExerciseId(request.params.exerciseId);
  const exercise = await getExercise(request.auth!.userId, exerciseId);

  response.status(200).json({ exercise });
}));
