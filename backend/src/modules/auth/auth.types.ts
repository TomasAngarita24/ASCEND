export interface AuthenticatedUser {
  id: string;
  email: string;
  createdAt: string;
  updatedAt?: string;
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
