import 'dotenv/config';

import { z } from 'zod';

const environmentSchema = z.object({
  DATABASE_URL: z.url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_AUDIENCE: z.string().min(1).default('ascend-mobile'),
  JWT_ISSUER: z.string().min(1).default('ascend-api'),
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
});

const parsedEnvironment = environmentSchema.parse(process.env);

export const env = {
  databaseUrl: parsedEnvironment.DATABASE_URL,
  jwtAccessSecret: parsedEnvironment.JWT_ACCESS_SECRET,
  jwtAudience: parsedEnvironment.JWT_AUDIENCE,
  jwtIssuer: parsedEnvironment.JWT_ISSUER,
  nodeEnv: parsedEnvironment.NODE_ENV,
  port: parsedEnvironment.PORT,
} as const;
