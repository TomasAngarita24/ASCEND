import { z } from 'zod';

import { HttpError } from '../../errors/http-error';

const listExercisesSchema = z.object({
  equipment: z.string().trim().optional().transform((val) => (val && val.length > 0 ? val : undefined)),
  limit: z.coerce.number().int().min(1).max(200).default(20),
  muscleGroup: z.string().trim().optional().transform((val) => (val && val.length > 0 ? val : undefined)),
  page: z.coerce.number().int().min(1).default(1),
  query: z.string().trim().optional().transform((val) => (val && val.length > 0 ? val : undefined)),
});

const createExerciseSchema = z.object({
  description: z.string().trim().min(1).optional(),
  equipment: z.string().trim().min(1).max(255).optional(),
  instructions: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).max(255),
  targetMuscleGroups: z.array(z.string().trim().min(1)).optional(),
});

const updateExerciseSchema = z.object({
  description: z.string().trim().nullable().optional(),
  equipment: z.string().trim().max(255).nullable().optional(),
  instructions: z.string().trim().nullable().optional(),
  mediaUrl: z.string().trim().nullable().optional(),
  name: z.string().trim().min(1).max(255).optional(),
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

export function validateUpdateExercise(value: unknown): z.infer<typeof updateExerciseSchema> {
  return parse(updateExerciseSchema, value);
}

export function validateExerciseId(value: unknown): string {
  return parse(z.uuid(), value);
}

export function validateExerciseList(value: unknown): z.infer<typeof listExercisesSchema> {
  return parse(listExercisesSchema, value);
}
