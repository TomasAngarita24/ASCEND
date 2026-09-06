import 'dotenv/config';

import { z } from 'zod';

const DEFAULT_CORS_ORIGINS = 'http://localhost:5173,http://127.0.0.1:5173';

const environmentSchema = z.object({
  APP_URL: z.url().default('http://localhost:5173'),
  CORS_ORIGINS: z.string().default(DEFAULT_CORS_ORIGINS),
  DATABASE_URL: z.url(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_AUDIENCE: z.string().min(1).default('ascend-app'),
  JWT_ISSUER: z.string().min(1).default('ascend-api'),
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z
    .string()
    .regex(/^(?!\s*$).+@.+\..+/, 'Must be an email or "Name <email>" format')
    .default('ASCEND <onboarding@resend.dev>'),
});

const parsedEnvironment = environmentSchema.parse(process.env);

export const env = {
  appUrl: parsedEnvironment.APP_URL,
  corsOrigins: parsedEnvironment.CORS_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0),
  databaseUrl: parsedEnvironment.DATABASE_URL,
  googleClientId: parsedEnvironment.GOOGLE_CLIENT_ID,
  googleClientIds: parsedEnvironment.GOOGLE_CLIENT_ID
    ? [parsedEnvironment.GOOGLE_CLIENT_ID]
    : [],
  jwtAccessSecret: parsedEnvironment.JWT_ACCESS_SECRET,
  jwtAudience: parsedEnvironment.JWT_AUDIENCE,
  jwtIssuer: parsedEnvironment.JWT_ISSUER,
  nodeEnv: parsedEnvironment.NODE_ENV,
  port: parsedEnvironment.PORT,
  resendApiKey: parsedEnvironment.RESEND_API_KEY,
  resendFromEmail: parsedEnvironment.RESEND_FROM_EMAIL,
} as const;
