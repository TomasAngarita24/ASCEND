import { z } from 'zod';

import { HttpError } from '../../errors/http-error';

const listExercisesSchema = z.object({
  equipment: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  muscleGroup: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  query: z.string().trim().min(1).optional(),
});

const createExerciseSchema = z.object({
  description: z.string().trim().min(1).optional(),
  equipment: z.string().trim().min(1).max(255).optional(),
  instructions: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).max(255),
  targetMuscleGroups: z.array(z.string().trim().min(1)).optional(),
});

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Request validation failed.');
  }

  return result.data;
}

export function validateCreateExercise(value: unknown): z.infer<typeof createExerciseSchema> {
  return parse(createExerciseSchema, value);
}

export function validateExerciseId(value: unknown): string {
  return parse(z.uuid(), value);
}

export function validateExerciseList(value: unknown): z.infer<typeof listExercisesSchema> {
  return parse(listExercisesSchema, value);
}
