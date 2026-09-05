import { Router } from 'express';

import { asyncHandler } from '../../lib/async-handler';
import { authenticate } from './auth.middleware';
import { authenticateWithGoogle, getAuthenticatedUser, login, logout, refresh, register } from './auth.service';
import { validateCredentials, validateGoogleAuth, validateRefreshToken } from './auth.validation';

export const authRouter = Router();

authRouter.post('/register', asyncHandler(async (request, response) => {
  const credentials = validateCredentials(request.body);
  const result = await register(credentials);

  response.status(201).json(result);
}));

authRouter.post('/login', asyncHandler(async (request, response) => {
  const credentials = validateCredentials(request.body);
  const result = await login(credentials);

  response.status(200).json(result);
}));

authRouter.post('/google', asyncHandler(async (request, response) => {
  const { idToken } = validateGoogleAuth(request.body);
  const result = await authenticateWithGoogle(idToken);

  response.status(200).json(result);
}));

authRouter.post('/refresh', asyncHandler(async (request, response) => {
  const { refreshToken } = validateRefreshToken(request.body);
  const result = await refresh(refreshToken);

  response.status(200).json(result);
}));

authRouter.post('/logout', asyncHandler(async (request, response) => {
  const { refreshToken } = validateRefreshToken(request.body);
  await logout(refreshToken);

  response.status(204).send();
}));

authRouter.get('/me', authenticate, asyncHandler(async (request, response) => {
  response.status(200).json({ user: request.authUser! });
}));
