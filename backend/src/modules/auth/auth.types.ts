export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface UpdateProfileInput {
  fullName?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
}

export interface AuthTokens {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
}

export interface AuthContext {
  sessionId: string;
  userId: string;
}
