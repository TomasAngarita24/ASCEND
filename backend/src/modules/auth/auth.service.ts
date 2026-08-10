import type { User } from '../../generated/prisma/client';
import { prisma } from '../../database/prisma';
import { HttpError } from '../../errors/http-error';
import type { AuthContext, AuthTokens, AuthenticatedUser } from './auth.types';
import { hashPassword, verifyPassword } from './password.service';
import { createAccessToken, createRefreshToken, hashRefreshToken } from './token.service';

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
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
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

export async function register(credentials: Credentials): Promise<AuthenticationResult> {
  const existingUser = await prisma.user.findUnique({ where: { email: credentials.email } });

  if (existingUser) {
    throw new HttpError(409, 'EMAIL_ALREADY_REGISTERED', 'The email is already registered.');
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
      throw new HttpError(409, 'EMAIL_ALREADY_REGISTERED', 'The email is already registered.');
    }

    throw error;
  }
}

export async function login(credentials: Credentials): Promise<AuthenticationResult> {
  const user = await prisma.user.findUnique({ where: { email: credentials.email } });

  if (!user || !(await verifyPassword(user.passwordHash, credentials.password))) {
    throw invalidCredentials();
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
