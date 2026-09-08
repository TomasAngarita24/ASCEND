import { rateLimit, ipKeyGenerator, type Options } from 'express-rate-limit';

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

/**
 * Slows brute-force attempts against a single account. Keyed by the normalized
 * email plus the client IP so broad (many-emails) and targeted (one-email)
 * attacks both trip a limit, while distinct users behind one NAT stay isolated.
 * Fails closed to a shared per-IP bucket when the request body has no email.
 */
export const perEmailCredentialLimiter = rateLimit({
  ...sharedOptions,
  limit: 5,
  windowMs: 60 * 1000,
  keyGenerator: (request) => {
    const rawEmail = (request.body as { email?: unknown } | undefined)?.email;
    const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : 'unknown';
    return `${ipKeyGenerator(request.ip ?? 'unknown')}:${email}`;
  },
});