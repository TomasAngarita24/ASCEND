import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler';
import { authenticate } from '../auth/auth.middleware';
import { deleteMeasurement, listMeasurements, saveMeasurement } from './measurement.service';
import { validateMeasurementId, validateSaveMeasurement } from './measurement.validation';

export const measurementRouter = Router();

measurementRouter.use(authenticate);

measurementRouter.get('/', asyncHandler(async (request, response) => {
  response.status(200).json(await listMeasurements(request.auth!.userId));
}));

measurementRouter.post('/', asyncHandler(async (request, response) => {
  const input = validateSaveMeasurement(request.body);
  const result = await saveMeasurement(request.auth!.userId, input);
  response.status(200).json({ measurement: result });
}));

measurementRouter.delete('/:id', asyncHandler(async (request, response) => {
  await deleteMeasurement(request.auth!.userId, validateMeasurementId(request.params.id));
  response.status(204).send();
}));
