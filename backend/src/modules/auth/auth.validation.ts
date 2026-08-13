import { z } from 'zod';

import { HttpError } from '../../errors/http-error';

const credentialsSchema = z.object({
  email: z.email().transform((email) => email.trim().toLowerCase()),
  password: z.string().min(8).max(128),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

function validate<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Request validation failed.');
  }

  return result.data;
}

export function validateCredentials(value: unknown): z.infer<typeof credentialsSchema> {
  return validate(credentialsSchema, value);
}

export function validateRefreshToken(value: unknown): z.infer<typeof refreshTokenSchema> {
  return validate(refreshTokenSchema, value);
}
