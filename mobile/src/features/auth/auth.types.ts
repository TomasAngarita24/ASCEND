export interface AuthenticatedUser {
  id: string;
  email: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Tokens {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
}

export interface AuthSession {
  user: AuthenticatedUser;
  tokens: Tokens;
}
