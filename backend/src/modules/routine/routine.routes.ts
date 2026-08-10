import { Router } from 'express';

import { asyncHandler } from '../../lib/async-handler';
import { authenticate } from '../auth/auth.middleware';
import {
  addRoutineExercise, createRoutine, deleteRoutine, deleteRoutineExercise, duplicateRoutine, getRoutine,
  listRoutines, reorderRoutineExercises, updateRoutine, updateRoutineExercise,
} from './routine.service';
import {
  validateAddRoutineExercise, validateCreateRoutine, validateReorder, validateRoutineId,
  validateUpdateRoutine, validateUpdateRoutineExercise,
} from './routine.validation';

export const routineRouter = Router();

routineRouter.use(authenticate);

routineRouter.get('/', asyncHandler(async (request, response) => {
  response.status(200).json(await listRoutines(request.auth!.userId));
}));

routineRouter.post('/', asyncHandler(async (request, response) => {
  const input = validateCreateRoutine(request.body);
  response.status(201).json({ routine: await createRoutine(request.auth!.userId, input.name) });
}));

routineRouter.get('/:routineId', asyncHandler(async (request, response) => {
  response.status(200).json({ routine: await getRoutine(request.auth!.userId, validateRoutineId(request.params.routineId)) });
}));

routineRouter.patch('/:routineId', asyncHandler(async (request, response) => {
  const input = validateUpdateRoutine(request.body);
  response.status(200).json({ routine: await updateRoutine(request.auth!.userId, validateRoutineId(request.params.routineId), input.name) });
}));

routineRouter.delete('/:routineId', asyncHandler(async (request, response) => {
  await deleteRoutine(request.auth!.userId, validateRoutineId(request.params.routineId));
  response.status(204).send();
}));

routineRouter.post('/:routineId/duplicate', asyncHandler(async (request, response) => {
  response.status(201).json({ routine: await duplicateRoutine(request.auth!.userId, validateRoutineId(request.params.routineId)) });
}));

routineRouter.post('/:routineId/exercises', asyncHandler(async (request, response) => {
  const input = validateAddRoutineExercise(request.body);
  const routineExercise = await addRoutineExercise(request.auth!.userId, validateRoutineId(request.params.routineId), input.exerciseId, input);
  response.status(201).json({ routineExercise });
}));

routineRouter.patch('/:routineId/exercises/:routineExerciseId', asyncHandler(async (request, response) => {
  const input = validateUpdateRoutineExercise(request.body);
  const routineExercise = await updateRoutineExercise(
    request.auth!.userId, validateRoutineId(request.params.routineId), validateRoutineId(request.params.routineExerciseId), input,
  );
  response.status(200).json({ routineExercise });
}));

routineRouter.delete('/:routineId/exercises/:routineExerciseId', asyncHandler(async (request, response) => {
  await deleteRoutineExercise(
    request.auth!.userId, validateRoutineId(request.params.routineId), validateRoutineId(request.params.routineExerciseId),
  );
  response.status(204).send();
}));

routineRouter.post('/:routineId/exercises/reorder', asyncHandler(async (request, response) => {
  const input = validateReorder(request.body);
  response.status(200).json({ routine: await reorderRoutineExercises(request.auth!.userId, validateRoutineId(request.params.routineId), input.routineExerciseIds) });
}));
