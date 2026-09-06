import { z } from 'zod';

import { HttpError } from '../../errors/http-error';

const measurementField = z.coerce.number().min(0).max(999.99).nullable().optional();
  const bodyFatField = z.coerce.number().min(0).max(99.99).nullable().optional();

const saveMeasurementSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weight: measurementField,
  neck: measurementField,
  shoulders: measurementField,
  chest: measurementField,
  waist: measurementField,
  hips: measurementField,
  bicep: measurementField,
  thigh: measurementField,
  calf: measurementField,
  bodyFat: bodyFatField,
}).strict();

export interface ValidatedSaveMeasurement {
  date: string;
  weight?: number | null;
  neck?: number | null;
  shoulders?: number | null;
  chest?: number | null;
  waist?: number | null;
  hips?: number | null;
  bicep?: number | null;
  thigh?: number | null;
  calf?: number | null;
  bodyFat?: number | null;
}

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Request validation failed.');
  }

  return result.data;
}

export function validateSaveMeasurement(value: unknown): z.infer<typeof saveMeasurementSchema> {
  return parse(saveMeasurementSchema, value);
}

export function validateMeasurementId(value: unknown): string {
  return parse(z.uuid(), value);
}