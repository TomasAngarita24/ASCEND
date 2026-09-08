import { z } from 'zod';

import { HttpError } from '../../errors/http-error';

const routineTemplateFiltersSchema = z.object({
  level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  goal: z.enum(['strength', 'hypertrophy', 'general']).optional(),
  equipment: z.enum(['Barra', 'Mancuernas', 'Maquinas', 'Ninguno']).optional(),
});

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Request validation failed.');
  }

  return result.data;
}

export function validateRoutineTemplateFilters(value: unknown): z.infer<typeof routineTemplateFiltersSchema> {
  return parse(routineTemplateFiltersSchema, value);
}

export function validateRoutineTemplateId(value: unknown): string {
  return parse(z.uuid(), value);
}