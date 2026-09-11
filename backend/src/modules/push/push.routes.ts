import { Router } from 'express';

import { asyncHandler } from '../../lib/async-handler';
import { authenticate } from '../auth/auth.middleware';
import {
  deleteSubscription,
  getPushSettings,
  savePushSettings,
  saveSubscription,
  sendPushToUser,
} from './push.service';
import { cancelRestPush, scheduleRestPush } from './push.scheduler';
import {
  validateEndpoint,
  validateSaveSettings,
  validateSaveSubscription,
  validateScheduleRest,
} from './push.validation';

export const pushRouter = Router();

pushRouter.use(authenticate);

pushRouter.get('/settings', asyncHandler(async (request, response) => {
  response.status(200).json({ settings: await getPushSettings(request.auth!.userId) });
}));

pushRouter.put('/settings', asyncHandler(async (request, response) => {
  const settings = await savePushSettings(request.auth!.userId, validateSaveSettings(request.body));
  response.status(200).json({ settings });
}));

pushRouter.post('/subscriptions', asyncHandler(async (request, response) => {
  const subscription = await saveSubscription(request.auth!.userId, validateSaveSubscription(request.body));
  response.status(201).json({ subscription });
}));

pushRouter.delete('/subscriptions', asyncHandler(async (request, response) => {
  await deleteSubscription(request.auth!.userId, validateEndpoint(request.body));
  response.status(204).send();
}));

pushRouter.post('/test', asyncHandler(async (request, response) => {
  await sendPushToUser(request.auth!.userId, {
    title: '¡ASCEND está activo!',
    body: 'Las notificaciones push funcionan correctamente.',
    tag: 'ascend-test',
    url: '/',
  });
  response.status(204).send();
}));

pushRouter.post('/rest', asyncHandler(async (request, response) => {
  const { seconds } = validateScheduleRest(request.body);
  scheduleRestPush(request.auth!.userId, seconds);
  response.status(204).send();
}));

pushRouter.delete('/rest', asyncHandler(async (request, response) => {
  cancelRestPush(request.auth!.userId);
  response.status(204).send();
}));