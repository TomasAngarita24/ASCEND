import type { NextFunction, Request, Response } from 'express';

import { HttpError } from '../../errors/http-error';
import { verifyAccessToken } from './token.service';
import { getAuthenticatedUser } from './auth.service';
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
  const authorization = request.header('authorization');

  if (!authorization?.startsWith('Bearer ')) {
    next(new HttpError(401, 'UNAUTHORIZED', 'Access token is missing, invalid, or expired.'));
    return;
  }

  try {
    request.auth = verifyAccessToken(authorization.slice('Bearer '.length));
    request.authUser = await getAuthenticatedUser(request.auth);
    next();
  } catch (error) {
    next(error);
  }
}
