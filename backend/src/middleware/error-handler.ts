import type { ErrorRequestHandler } from 'express';

import { Prisma } from '../generated/prisma/client';
import { HttpError } from '../errors/http-error';

const PRISMA_ERROR_MAP: Record<string, { statusCode: number; code: string; message: string }> = {
  P2002: {
    statusCode: 409,
    code: 'UNIQUE_CONSTRAINT_VIOLATION',
    message: 'A record with the same value already exists.',
  },
  P2003: {
    statusCode: 400,
    code: 'FOREIGN_KEY_CONSTRAINT_VIOLATION',
    message: 'The requested operation violates a data relationship.',
  },
  P2025: {
    statusCode: 404,
    code: 'NOT_FOUND',
    message: 'The requested record does not exist.',
  },
};

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof HttpError) {
    response.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
      },
    });
    return;
  }

  if (error instanceof SyntaxError && 'status' in error && error.status === 400) {
    response.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed.',
      },
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && PRISMA_ERROR_MAP[error.code]) {
    const mapped = PRISMA_ERROR_MAP[error.code];
    console.error('Prisma request error', error.code, error.meta);
    response.status(mapped.statusCode).json({
      error: {
        code: mapped.code,
        message: mapped.message,
      },
    });
    return;
  }

  console.error('Unhandled request error', error);

  response.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred.',
    },
  });
};
