import { createHash } from 'node:crypto';

import type { User } from '../../generated/prisma/client';
import { prisma } from '../../database/prisma';
import { env } from '../../config/env';
import { HttpError } from '../../errors/http-error';
import { sendPasswordResetEmailWithLink } from './email.service';
import type { AuthContext, AuthTokens, AuthenticatedUser } from './auth.types';
import { hashPassword, verifyPassword } from './password.service';
import { createAccessToken, createRefreshToken, hashRefreshToken } from './token.service';
import { verifyGoogleIdToken } from './google.service';

interface Credentials {
  email: string;
  password: string;
}

interface AuthenticationResult extends AuthTokens {
  user: AuthenticatedUser;
}

function toAuthenticatedUser(user: User): AuthenticatedUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export async function updateProfile(userId: string, input: { fullName?: string | null; bio?: string | null; avatarUrl?: string | null }): Promise<AuthenticatedUser> {
  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) {
    throw new HttpError(404, 'UNAUTHORIZED', 'User does not exist.');
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
      ...(input.bio !== undefined ? { bio: input.bio } : {}),
      ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
    },
  });

  return toAuthenticatedUser(user);
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user || !user.passwordHash) {
    throw new HttpError(400, 'CHANGE_PASSWORD_UNAVAILABLE', 'Password change is not available for this account.');
  }

  if (!(await verifyPassword(user.passwordHash, currentPassword))) {
    throw new HttpError(400, 'INVALID_CURRENT_PASSWORD', 'Current password is incorrect.');
  }

  const newHash = await hashPassword(newPassword);
  await prisma.session.deleteMany({ where: { userId } });
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newHash },
  });
}

export async function deleteAccount(userId: string): Promise<void> {
  await prisma.user.delete({ where: { id: userId } });
}

const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

function createPasswordResetToken(): { token: string; hash: string; expiresAt: Date } {
  const token = createRefreshToken(); // Random 256-bit token, same shape as a refresh token.
  return { token: token.token, hash: token.hash, expiresAt: new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS) };
}

export async function forgotPassword(email: string): Promise<void> {
  const existing = await prisma.user.findUnique({ where: { email } });

  // Always report success, regardless of whether the account exists, to avoid
  // leaking which emails are registered.
  if (!existing?.passwordHash || !existing.email) {
    return;
  }

  const reset = createPasswordResetToken();

  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId: existing.id } }),
    prisma.passwordResetToken.create({
      data: {
        userId: existing.id,
        tokenHash: reset.hash,
        expiresAt: reset.expiresAt,
      },
    }),
  ]);

  const resetUrl = `${env.appUrl}/reset-password?token=${encodeURIComponent(reset.token)}`;
  await sendPasswordResetEmailWithLink(existing.email, resetUrl);
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const tokenHash = createHash('sha256').update(token).digest('hex');

  const reset = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!reset || reset.expiresAt <= new Date()) {
    throw new HttpError(400, 'INVALID_RESET_TOKEN', 'The password reset token is invalid or expired.');
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.session.deleteMany({ where: { userId: reset.userId } }),
    prisma.passwordResetToken.delete({ where: { id: reset.id } }),
    prisma.user.update({
      where: { id: reset.userId },
      data: { passwordHash },
    }),
  ]);
}

async function createSessionTokens(userId: string): Promise<AuthTokens> {
  const refreshToken = createRefreshToken();
  const session = await prisma.session.create({
    data: {
      userId,
      refreshTokenHash: refreshToken.hash,
      expiresAt: refreshToken.expiresAt,
    },
  });

  return {
    ...createAccessToken({ sessionId: session.id, userId }),
    refreshToken: refreshToken.token,
  };
}

function invalidCredentials(): HttpError {
  return new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
}

function accountCreationRejected(): HttpError {
  return new HttpError(400, 'REGISTRATION_REJECTED', 'The account could not be created.');
}

export async function register(credentials: Credentials): Promise<AuthenticationResult> {
  const existingUser = await prisma.user.findUnique({ where: { email: credentials.email } });

  if (existingUser) {
    throw accountCreationRejected();
  }

  const passwordHash = await hashPassword(credentials.password);

  try {
    const user = await prisma.user.create({
      data: {
        email: credentials.email,
        passwordHash,
      },
    });

    return {
      user: toAuthenticatedUser(user),
      ...(await createSessionTokens(user.id)),
    };
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      throw accountCreationRejected();
    }

    throw error;
  }
}

export async function login(credentials: Credentials): Promise<AuthenticationResult> {
  const user = await prisma.user.findUnique({ where: { email: credentials.email } });

  if (!user || !user.passwordHash || !(await verifyPassword(user.passwordHash, credentials.password))) {
    throw invalidCredentials();
  }

  return {
    user: toAuthenticatedUser(user),
    ...(await createSessionTokens(user.id)),
  };
}

export async function authenticateWithGoogle(idToken: string): Promise<AuthenticationResult> {
  const { email, googleId } = await verifyGoogleIdToken(idToken);

  let user = await prisma.user.findUnique({ where: { googleId } });

  if (!user) {
    const userByEmail = await prisma.user.findUnique({ where: { email } });

    if (userByEmail) {
      user = await prisma.user.update({
        where: { id: userByEmail.id },
        data: { googleId },
      });
    } else {
      user = await prisma.user.create({
        data: {
          email,
          googleId,
          passwordHash: null,
        },
      });
    }
  }

  return {
    user: toAuthenticatedUser(user),
    ...(await createSessionTokens(user.id)),
  };
}

export async function refresh(refreshToken: string): Promise<AuthTokens> {
  const refreshTokenHash = hashRefreshToken(refreshToken);
  const session = await prisma.session.findUnique({ where: { refreshTokenHash } });

  if (!session || session.expiresAt <= new Date()) {
    throw new HttpError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token is invalid or expired.');
  }

  const nextRefreshToken = createRefreshToken();

  return prisma.$transaction(async (transaction) => {
    const deletedSession = await transaction.session.deleteMany({
      where: {
        id: session.id,
        refreshTokenHash,
      },
    });

    if (deletedSession.count !== 1) {
      throw new HttpError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token is invalid or expired.');
    }

    const nextSession = await transaction.session.create({
      data: {
        userId: session.userId,
        refreshTokenHash: nextRefreshToken.hash,
        expiresAt: nextRefreshToken.expiresAt,
      },
    });

    return {
      ...createAccessToken({ sessionId: nextSession.id, userId: session.userId }),
      refreshToken: nextRefreshToken.token,
    };
  });
}

export async function logout(refreshToken: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { refreshTokenHash: hashRefreshToken(refreshToken) },
  });
}

export async function getAuthenticatedUser(context: AuthContext): Promise<AuthenticatedUser> {
  const session = await prisma.session.findFirst({
    where: {
      id: context.sessionId,
      userId: context.userId,
      expiresAt: { gt: new Date() },
    },
    include: { user: true },
  });

  if (!session) {
    throw new HttpError(401, 'UNAUTHORIZED', 'Access token is missing, invalid, or expired.');
  }

  return toAuthenticatedUser(session.user);
}
