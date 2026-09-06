import type { NextFunction, Request, Response } from 'express';

import { HttpError } from '../../errors/http-error';
import { verifyAccessToken } from './token.service';
import { getAuthenticatedUser } from './auth.service';
import { ACCESS_TOKEN_COOKIE } from './auth.cookies';
import type { AuthContext, AuthenticatedUser } from './auth.types';

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
      authUser?: AuthenticatedUser;
    }
  }
}

export async function authenticate(
  request: Request,
  _response: Response,
  next: NextFunction,
): Promise<void> {
  const cookieToken = request.cookies?.[ACCESS_TOKEN_COOKIE];
  const authorization = request.header('authorization');

  const accessToken =
    typeof cookieToken === 'string' && cookieToken.length > 0
      ? cookieToken
      : authorization?.startsWith('Bearer ')
        ? authorization.slice('Bearer '.length)
        : null;

  if (!accessToken) {
    next(new HttpError(401, 'UNAUTHORIZED', 'Access token is missing, invalid, or expired.'));
    return;
  }

  try {
    request.auth = verifyAccessToken(accessToken);
    request.authUser = await getAuthenticatedUser(request.auth);
    next();
  } catch (error) {
    next(error);
  }
}
