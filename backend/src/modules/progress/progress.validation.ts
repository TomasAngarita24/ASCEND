import { z } from 'zod';

import { HttpError } from '../../errors/http-error';

const statisticsSchema = z.object({
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
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

export function validateStatistics(value: unknown): z.infer<typeof statisticsSchema> {
  return parse(statisticsSchema, value);
}

export function validateExerciseProgression(value: unknown): z.infer<typeof statisticsSchema> {
  return parse(statisticsSchema, value);
}

const chartSchema = z.object({
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  exerciseId: z.uuid().optional(),
  metric: z.enum(['weight', 'volume', 'repetitions', 'workout_frequency', 'weekly_volume']),
}).refine(
  (value) => !value.dateFrom || !value.dateTo || value.dateFrom <= value.dateTo,
  { message: 'The start date cannot be after the end date.' },
).refine(
  (value) => !['weight', 'volume', 'repetitions'].includes(value.metric) || value.exerciseId !== undefined,
  { message: 'An exercise identifier is required for this metric.' },
);

export function validateProgressChart(value: unknown): z.infer<typeof chartSchema> {
  return parse(chartSchema, value);
}
