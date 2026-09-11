import { z } from 'zod';

import { HttpError } from '../../errors/http-error';

const saveSubscriptionSchema = z
  .object({
    endpoint: z.string().url(),
    keys: z
      .object({
        p256dh: z.string().min(1),
        auth: z.string().min(1),
      })
      .strict(),
  })
  .strict();

const saveSettingsSchema = z
  .object({
    reminderEnabled: z.boolean().optional(),
    reminderHour: z.number().int().min(0).max(23).nullable().optional(),
    reminderMinute: z.number().int().min(0).max(59).nullable().optional(),
    reminderTzOffsetMin: z.number().int().min(-840).max(840).optional(),
  })
  .strict();

const scheduleRestSchema = z
  .object({
    seconds: z.number().int().min(5).max(3600),
  })
  .strict();

const deleteSubscriptionSchema = z
  .object({
    endpoint: z.string().url(),
  })
  .strict();

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Request validation failed.');
  }

  return result.data;
}

export function validateSaveSubscription(value: unknown): z.infer<typeof saveSubscriptionSchema> {
  return parse(saveSubscriptionSchema, value);
}

export function validateSaveSettings(value: unknown): z.infer<typeof saveSettingsSchema> {
  return parse(saveSettingsSchema, value);
}

export function validateScheduleRest(value: unknown): z.infer<typeof scheduleRestSchema> {
  return parse(scheduleRestSchema, value);
}

export function validateEndpoint(value: unknown): string {
  return parse(deleteSubscriptionSchema, value).endpoint;
}