import { Router } from 'express';

import { asyncHandler } from '../../lib/async-handler';
import { authenticate } from '../auth/auth.middleware';
import { getEstimatedOneRepMax, getStatistics } from './progress.service';
import { validateStatistics } from './progress.validation';
import { validateExerciseId } from '../exercise/exercise.validation';

export const progressRouter = Router();

progressRouter.use(authenticate);

progressRouter.get('/statistics', asyncHandler(async (request, response) => {
  response.status(200).json(await getStatistics(request.auth!.userId, validateStatistics(request.query)));
}));

progressRouter.get('/exercises/:exerciseId/estimated-one-rep-max', asyncHandler(async (request, response) => {
  response.status(200).json(await getEstimatedOneRepMax(request.auth!.userId, validateExerciseId(request.params.exerciseId)));
}));
