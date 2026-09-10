import { z } from 'zod';

import { HttpError } from '../../errors/http-error';

const credentialsSchema = z.object({
  email: z.email().transform((email) => email.trim().toLowerCase()),
  password: z.string().min(8).max(128),
}).strict();

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
}).strict();

const googleAuthSchema = z.object({
  idToken: z.string().min(1),
}).strict();

const updateProfileSchema = z.object({
  fullName: z.string().trim().max(255).nullable().optional(),
  bio: z.string().max(2000).nullable().optional(),
  avatarUrl: z.string().trim().max(450000)
    .refine(
      (value) => value.startsWith('data:image/') || /^https?:\/\//.test(value),
      { message: 'avatarUrl must be an http(s) URL or a data image URL.' },
    )
    .nullable()
    .optional(),
}).strict();

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8).max(128),
}).strict();

const forgotPasswordSchema = z.object({
  email: z.email(),
}).strict();

const resetPasswordSchema = z.object({
  token: z.string().min(1).max(512),
  password: z.string().min(8).max(128),
}).strict();

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

export function validateGoogleAuth(value: unknown): z.infer<typeof googleAuthSchema> {
  return validate(googleAuthSchema, value);
}

export function validateUpdateProfile(value: unknown): z.infer<typeof updateProfileSchema> {
  return validate(updateProfileSchema, value);
}

export function validateChangePassword(value: unknown): z.infer<typeof changePasswordSchema> {
  return validate(changePasswordSchema, value);
}

export function validateForgotPassword(value: unknown): z.infer<typeof forgotPasswordSchema> {
  return validate(forgotPasswordSchema, value);
}

export function validateResetPassword(value: unknown): z.infer<typeof resetPasswordSchema> {
  return validate(resetPasswordSchema, value);
}
