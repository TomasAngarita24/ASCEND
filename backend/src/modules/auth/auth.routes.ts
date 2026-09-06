import { Router } from 'express';

import { asyncHandler } from '../../lib/async-handler';
import { credentialLimiter } from '../../middleware/rate-limit';
import { authenticate } from './auth.middleware';
import { setAuthCookies, clearAuthCookies, REFRESH_TOKEN_COOKIE } from './auth.cookies';
import { authenticateWithGoogle, changePassword, deleteAccount, forgotPassword, getAuthenticatedUser, login, logout, refresh, register, resetPassword, updateProfile } from './auth.service';
import { validateChangePassword, validateCredentials, validateForgotPassword, validateGoogleAuth, validateRefreshToken, validateResetPassword, validateUpdateProfile } from './auth.validation';

export const authRouter = Router();

authRouter.post('/register', credentialLimiter, asyncHandler(async (request, response) => {
  const credentials = validateCredentials(request.body);
  const result = await register(credentials);
  setAuthCookies(response, result);

  response.status(201).json(result);
}));

authRouter.post('/login', credentialLimiter, asyncHandler(async (request, response) => {
  const credentials = validateCredentials(request.body);
  const result = await login(credentials);
  setAuthCookies(response, result);

  response.status(200).json(result);
}));

authRouter.post('/google', credentialLimiter, asyncHandler(async (request, response) => {
  const { idToken } = validateGoogleAuth(request.body);
  const result = await authenticateWithGoogle(idToken);
  setAuthCookies(response, result);

  response.status(200).json(result);
}));

authRouter.post('/refresh', asyncHandler(async (request, response) => {
  const refreshToken =
    typeof request.cookies?.[REFRESH_TOKEN_COOKIE] === 'string'
      ? request.cookies[REFRESH_TOKEN_COOKIE]
      : validateRefreshToken(request.body).refreshToken;
  const result = await refresh(refreshToken);
  setAuthCookies(response, result);

  response.status(200).json(result);
}));

authRouter.post('/forgot-password', asyncHandler(async (request, response) => {
  const { email } = validateForgotPassword(request.body);
  await forgotPassword(email);

  response.status(204).send();
}));

authRouter.post('/reset-password', asyncHandler(async (request, response) => {
  const { token, password } = validateResetPassword(request.body);
  await resetPassword(token, password);

  response.status(204).send();
}));

authRouter.post('/logout', asyncHandler(async (request, response) => {
  if (typeof request.cookies?.[REFRESH_TOKEN_COOKIE] === 'string') {
    await logout(request.cookies[REFRESH_TOKEN_COOKIE]);
  } else {
    const { refreshToken } = validateRefreshToken(request.body);
    await logout(refreshToken);
  }
  clearAuthCookies(response);

  response.status(204).send();
}));

authRouter.get('/me', authenticate, asyncHandler(async (request, response) => {
  response.status(200).json({ user: request.authUser! });
}));

authRouter.patch('/me', authenticate, asyncHandler(async (request, response) => {
  const input = validateUpdateProfile(request.body);
  const updated = await updateProfile(request.auth!.userId, input);
  response.status(200).json({ user: updated });
}));

authRouter.patch('/me/password', authenticate, asyncHandler(async (request, response) => {
  const { currentPassword, newPassword } = validateChangePassword(request.body);
  await changePassword(request.auth!.userId, currentPassword, newPassword);
  clearAuthCookies(response);
  response.status(204).send();
}));

authRouter.delete('/me', authenticate, asyncHandler(async (request, response) => {
  await deleteAccount(request.auth!.userId);
  clearAuthCookies(response);
  response.status(204).send();
}));
