import { Router } from 'express';

import { asyncHandler } from '../../lib/async-handler';
import { authenticate } from '../auth/auth.middleware';
import {
  getEstimatedOneRepMax, getExerciseProgression, getMuscleGroupStatistics, getProgressChart, getStatistics,
} from './progress.service';
import { getPersonalRecords } from './personal-record.service';
import { validateExerciseProgression, validateProgressChart, validateStatistics } from './progress.validation';
import { validateExerciseId } from '../exercise/exercise.validation';

export const progressRouter = Router();

progressRouter.use(authenticate);

progressRouter.get('/statistics', asyncHandler(async (request, response) => {
  response.status(200).json(await getStatistics(request.auth!.userId, validateStatistics(request.query)));
}));

progressRouter.get('/exercises/:exerciseId/estimated-one-rep-max', asyncHandler(async (request, response) => {
  response.status(200).json(await getEstimatedOneRepMax(request.auth!.userId, validateExerciseId(request.params.exerciseId)));
}));

progressRouter.get('/exercises/:exerciseId', asyncHandler(async (request, response) => {
  response.status(200).json(await getExerciseProgression(
    request.auth!.userId,
    validateExerciseId(request.params.exerciseId),
    validateExerciseProgression(request.query),
  ));
}));

progressRouter.get('/personal-records', asyncHandler(async (request, response) => {
  response.status(200).json(await getPersonalRecords(request.auth!.userId));
}));

progressRouter.get('/charts', asyncHandler(async (request, response) => {
  response.status(200).json(await getProgressChart(request.auth!.userId, validateProgressChart(request.query)));
}));

progressRouter.get('/muscle-groups', asyncHandler(async (request, response) => {
  response.status(200).json(await getMuscleGroupStatistics(request.auth!.userId));
}));
