import { rateLimit, type Options } from 'express-rate-limit';

const RATE_LIMIT_RESPONSE = {
  error: {
    code: 'RATE_LIMITED',
    message: 'Too many requests. Please try again later.',
  },
} as const;

const sharedOptions = {
  legacyHeaders: false,
  limit: 60,
  message: RATE_LIMIT_RESPONSE,
  standardHeaders: 'draft-7',
  windowMs: 60 * 1000,
} satisfies Partial<Options>;

export const authLimiter = rateLimit(sharedOptions);

export const credentialLimiter = rateLimit({
  ...sharedOptions,
  limit: 20,
  windowMs: 60 * 1000,
});