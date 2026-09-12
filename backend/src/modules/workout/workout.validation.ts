import { z } from 'zod';

import { HttpError } from '../../errors/http-error';

const positiveInteger = z.coerce.number().int().min(1);
const nonNegativeNumber = z.coerce.number().min(0).max(999999.99);
const clearableNumber = (schema: z.ZodType<number>) => z.union([z.null(), schema]).optional();
const setType = z.enum(['normal', 'warmup', 'drop', 'drop_set', 'failure']).transform((value) =>
  value === 'drop' ? 'drop_set' : value,
);
const workoutId = z.uuid();

const startWorkoutSchema = z.object({ routineId: workoutId.optional() }).strict();
const addWorkoutExerciseSchema = z.object({
  exerciseId: workoutId,
  position: positiveInteger.optional(),
}).strict();
const createSetSchema = z.object({
  isCompleted: z.boolean().optional(),
  notes: z.string().trim().min(1).optional(),
  repetitions: clearableNumber(positiveInteger),
  rpe: z.coerce.number().min(0).max(10).optional(),
  setNumber: positiveInteger.optional(),
  setType: setType.optional(),
  weight: clearableNumber(nonNegativeNumber),
}).strict();
const updateSetSchema = createSetSchema
  .omit({ setNumber: true })
  .refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required.' });
const reorderWorkoutExercisesSchema = z.object({
  exerciseIds: z.array(workoutId).min(1).max(100),
}).strict();

const exportRowSchema = z.object({
  workoutId: z.string().trim().max(255).nullish(),
  date: z.string().trim().max(50).nullish(),
  startedAt: z.string().trim().max(50).nullish(),
  completedAt: z.string().trim().max(50).nullish(),
  durationSeconds: clearableNumber(z.coerce.number().int().min(0)),
  exercise: z.string().trim().max(255).nullish(),
  setNumber: clearableNumber(z.coerce.number().int().min(1)),
  weight: clearableNumber(z.coerce.number().min(0).max(999999.99)),
  repetitions: clearableNumber(z.coerce.number().int().min(0).max(100000)),
  rpe: clearableNumber(z.coerce.number().min(0).max(10)),
  setType: z.enum(['normal', 'warmup', 'drop', 'drop_set', 'failure']).transform((value) =>
    value === 'drop' ? 'drop_set' : value,
  ).nullish(),
  notes: z.string().max(2000).nullish(),
  volume: clearableNumber(z.coerce.number().min(0).max(99999999)),
});
const importWorkoutHistorySchema = z.object({
  data: z.array(exportRowSchema).min(1).max(10000),
});
const workoutHistorySchema = z.object({
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  page: z.coerce.number().int().min(1).default(1),
  status: z.enum(['completed', 'cancelled']).default('completed'),
}).refine(
  (value) => !value.dateFrom || !value.dateTo || value.dateFrom <= value.dateTo,
  { message: 'The start date cannot be after the end date.' },
);

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

export function validateWorkoutHistory(value: unknown): z.infer<typeof workoutHistorySchema> {
  return parse(workoutHistorySchema, value);
}

export function validateReorderWorkoutExercises(value: unknown): { exerciseIds: string[] } {
  return parse(reorderWorkoutExercisesSchema, value);
}

export function validateImportWorkoutHistory(value: unknown): z.infer<typeof importWorkoutHistorySchema> {
  return parse(importWorkoutHistorySchema, value);
}

export function validateWorkoutId(value: unknown): string {
  return parse(workoutId, value);
}
