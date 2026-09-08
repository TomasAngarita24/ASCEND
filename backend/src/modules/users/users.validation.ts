import { z } from 'zod';

import { HttpError } from '../../errors/http-error';

const id = z.uuid();

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  page: z.coerce.number().int().min(1).default(1),
});

const searchQuerySchema = z.object({
  q: z.string().trim().max(100).default(''),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  page: z.coerce.number().int().min(1).default(1),
});

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Request validation failed.');
  }

  return result.data;
}

export function validateUserId(value: unknown): string {
  return parse(id, value);
}

export function validateListQuery(value: unknown): z.infer<typeof listQuerySchema> {
  return parse(listQuerySchema, value);
}

export function validateSearchQuery(value: unknown): z.infer<typeof searchQuerySchema> {
  return parse(searchQuerySchema, value);
}