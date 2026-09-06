import { createHash, randomBytes } from 'node:crypto';

import jwt, { type JwtPayload } from 'jsonwebtoken';

import { env } from '../../config/env';
import { HttpError } from '../../errors/http-error';
import type { AuthContext, AuthTokens } from './auth.types';

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

export { ACCESS_TOKEN_TTL_SECONDS, REFRESH_TOKEN_TTL_SECONDS };

export function createAccessToken(context: AuthContext): Pick<AuthTokens, 'accessToken' | 'accessTokenExpiresAt'> {
  const accessToken = jwt.sign(
    { sid: context.sessionId },
    env.jwtAccessSecret,
    {
      algorithm: 'HS256',
      audience: env.jwtAudience,
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      issuer: env.jwtIssuer,
      subject: context.userId,
    },
  );

  return {
    accessToken,
    accessTokenExpiresAt: new Date(Date.now() + ACCESS_TOKEN_TTL_SECONDS * 1000).toISOString(),
  };
}

export function createRefreshToken(): { expiresAt: Date; hash: string; token: string } {
  const token = randomBytes(32).toString('base64url');

  return {
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000),
    hash: hashRefreshToken(token),
    token,
  };
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function verifyAccessToken(token: string): AuthContext {
  try {
    const payload = jwt.verify(token, env.jwtAccessSecret, {
      algorithms: ['HS256'],
      audience: env.jwtAudience,
      issuer: env.jwtIssuer,
    });

    if (typeof payload === 'string') {
      throw new Error('Invalid token payload.');
    }

    const { sid, sub } = payload as JwtPayload & { sid?: unknown };

    if (typeof sid !== 'string' || typeof sub !== 'string') {
      throw new Error('Missing token claims.');
    }

    return { sessionId: sid, userId: sub };
  } catch {
    throw new HttpError(401, 'UNAUTHORIZED', 'Access token is missing, invalid, or expired.');
  }
}
