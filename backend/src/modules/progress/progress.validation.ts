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
