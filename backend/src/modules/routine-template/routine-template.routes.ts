import { Router } from 'express';

import { asyncHandler } from '../../lib/async-handler';
import { authenticate } from '../auth/auth.middleware';
import { addRoutineTemplateToUser, getRoutineTemplate, listRoutineTemplates } from './routine-template.service';
import { validateRoutineTemplateFilters, validateRoutineTemplateId } from './routine-template.validation';

export const routineTemplatesRouter = Router();

routineTemplatesRouter.use(authenticate);

routineTemplatesRouter.get('/', asyncHandler(async (request, response) => {
  const filters = validateRoutineTemplateFilters(request.query);
  response.status(200).json(await listRoutineTemplates(filters));
}));

routineTemplatesRouter.get('/:templateId', asyncHandler(async (request, response) => {
  response.status(200).json({ template: await getRoutineTemplate(validateRoutineTemplateId(request.params.templateId)) });
}));

routineTemplatesRouter.post('/:templateId/add', asyncHandler(async (request, response) => {
  const routine = await addRoutineTemplateToUser(request.auth!.userId, validateRoutineTemplateId(request.params.templateId));
  response.status(201).json({ routine });
}));