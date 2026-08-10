import { z } from 'zod';

import { HttpError } from '../../errors/http-error';

const routineName = z.string().trim().min(1).max(255);
const positiveInteger = z.coerce.number().int().min(1);
const nonNegativeInteger = z.coerce.number().int().min(0);
const nonNegativeNumber = z.coerce.number().min(0).max(999999.99);

const createRoutineSchema = z.object({ name: routineName });
const updateRoutineSchema = z.object({ name: routineName }).strict();
const exerciseConfigurationSchema = z.object({
  notes: z.string().trim().min(1).optional(),
  position: positiveInteger.optional(),
  restSeconds: nonNegativeInteger.optional(),
  targetRepetitionsMax: positiveInteger.optional(),
  targetRepetitionsMin: positiveInteger.optional(),
  targetSets: positiveInteger.optional(),
  targetWeight: nonNegativeNumber.optional(),
});
const addRoutineExerciseSchema = exerciseConfigurationSchema.extend({ exerciseId: z.uuid() }).refine(
  (value) => value.targetRepetitionsMin === undefined
    || value.targetRepetitionsMax === undefined
    || value.targetRepetitionsMin <= value.targetRepetitionsMax,
  { message: 'Minimum repetitions cannot exceed maximum repetitions.' },
);
const updateRoutineExerciseSchema = exerciseConfigurationSchema
  .refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required.' })
  .refine(
    (value) => value.targetRepetitionsMin === undefined
      || value.targetRepetitionsMax === undefined
      || value.targetRepetitionsMin <= value.targetRepetitionsMax,
    { message: 'Minimum repetitions cannot exceed maximum repetitions.' },
  );
const reorderSchema = z.object({ routineExerciseIds: z.array(z.uuid()) });

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Request validation failed.');
  }

  return result.data;
}

export function validateCreateRoutine(value: unknown): z.infer<typeof createRoutineSchema> {
  return parse(createRoutineSchema, value);
}

export function validateUpdateRoutine(value: unknown): z.infer<typeof updateRoutineSchema> {
  return parse(updateRoutineSchema, value);
}

export function validateAddRoutineExercise(value: unknown): z.infer<typeof addRoutineExerciseSchema> {
  return parse(addRoutineExerciseSchema, value);
}

export function validateUpdateRoutineExercise(value: unknown): z.infer<typeof updateRoutineExerciseSchema> {
  return parse(updateRoutineExerciseSchema, value);
}

export function validateReorder(value: unknown): z.infer<typeof reorderSchema> {
  return parse(reorderSchema, value);
}

export function validateRoutineId(value: unknown): string {
  return parse(z.uuid(), value);
}
