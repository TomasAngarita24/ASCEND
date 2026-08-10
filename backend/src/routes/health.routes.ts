import { Router } from 'express';

import { prisma } from '../database/prisma';
import { HttpError } from '../errors/http-error';

export const healthRouter = Router();

healthRouter.get('/health', async (_request, response, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    response.status(200).json({
      status: 'ok',
      database: 'connected',
    });
  } catch {
    next(new HttpError(503, 'DATABASE_UNAVAILABLE', 'Database connection is unavailable.'));
  }
});
