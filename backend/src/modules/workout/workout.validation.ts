import { z } from 'zod';

import { HttpError } from '../../errors/http-error';

const positiveInteger = z.coerce.number().int().min(1);
const nonNegativeNumber = z.coerce.number().min(0).max(999999.99);
const setType = z.enum(['normal', 'warmup', 'drop_set', 'failure']);
const workoutId = z.uuid();

const startWorkoutSchema = z.object({ routineId: workoutId.optional() }).strict();
const addWorkoutExerciseSchema = z.object({
  exerciseId: workoutId,
  position: positiveInteger.optional(),
});
const createSetSchema = z.object({
  isCompleted: z.boolean().optional(),
  notes: z.string().trim().min(1).optional(),
  repetitions: positiveInteger.optional(),
  rpe: z.coerce.number().min(0).max(10).optional(),
  setNumber: positiveInteger.optional(),
  setType: setType.optional(),
  weight: nonNegativeNumber.optional(),
});
const updateSetSchema = createSetSchema
  .omit({ setNumber: true })
  .refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required.' });

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Request validation failed.');
  }

  return result.data;
}

export function validateStartWorkout(value: unknown): z.infer<typeof startWorkoutSchema> {
  return parse(startWorkoutSchema, value);
}

export function validateAddWorkoutExercise(value: unknown): z.infer<typeof addWorkoutExerciseSchema> {
  return parse(addWorkoutExerciseSchema, value);
}

export function validateCreateSet(value: unknown): z.infer<typeof createSetSchema> {
  return parse(createSetSchema, value);
}

export function validateUpdateSet(value: unknown): z.infer<typeof updateSetSchema> {
  return parse(updateSetSchema, value);
}

export function validateWorkoutId(value: unknown): string {
  return parse(workoutId, value);
}
