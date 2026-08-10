import { ApiClient, ApiError, type ApiRequestOptions } from '../../lib/api-client';
import type { AuthSession, AuthenticatedUser, Tokens } from './auth.types';
import { TokenStorage } from './token-storage';

interface Credentials {
  email: string;
  password: string;
}

interface AuthenticationResponse extends Tokens {
  user: AuthenticatedUser;
}

interface RefreshResponse extends Tokens {}

interface ProfileResponse {
  user: AuthenticatedUser;
}

export class AuthService {
  constructor(
    private readonly apiClient: ApiClient,
    private readonly tokenStorage: TokenStorage,
  ) {}

  async login(credentials: Credentials): Promise<AuthSession> {
    return this.authenticate('/auth/login', credentials);
  }

  async register(credentials: Credentials): Promise<AuthSession> {
    return this.authenticate('/auth/register', credentials);
  }

  async restoreSession(): Promise<AuthSession | null> {
    const tokens = await this.tokenStorage.read();
    if (!tokens) {
      return null;
    }
    try {
      const profile = await this.apiClient.request<ProfileResponse>('/auth/me', {
        accessToken: tokens.accessToken,
      });
      return { user: profile.user, tokens };
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) {
        throw error;
      }
    }
    try {
      const refreshedTokens = await this.refresh(tokens.refreshToken);
      const profile = await this.apiClient.request<ProfileResponse>('/auth/me', {
        accessToken: refreshedTokens.accessToken,
      });
      return { user: profile.user, tokens: refreshedTokens };
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await this.tokenStorage.clear();
        return null;
      }
      throw error;
    }
  }

  async logout(tokens: Tokens): Promise<void> {
    try {
      await this.apiClient.request<void>('/auth/logout', {
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
        method: 'POST',
      });
    } finally {
      await this.tokenStorage.clear();
    }
  }

  async requestAuthenticated<T>(
    tokens: Tokens,
    path: string,
    options: ApiRequestOptions = {},
  ): Promise<{ data: T; tokens: Tokens }> {
    try {
      const data = await this.apiClient.request<T>(path, { ...options, accessToken: tokens.accessToken });
      return { data, tokens };
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) {
        throw error;
      }
    }
    const refreshedTokens = await this.refresh(tokens.refreshToken);
    const data = await this.apiClient.request<T>(path, { ...options, accessToken: refreshedTokens.accessToken });
    return { data, tokens: refreshedTokens };
  }

  private async authenticate(path: string, credentials: Credentials): Promise<AuthSession> {
    const response = await this.apiClient.request<AuthenticationResponse>(path, {
      body: JSON.stringify(credentials),
      method: 'POST',
    });
    const tokens: Tokens = {
      accessToken: response.accessToken,
      accessTokenExpiresAt: response.accessTokenExpiresAt,
      refreshToken: response.refreshToken,
    };
    await this.tokenStorage.save(tokens);
    return { user: response.user, tokens };
  }

  private async refresh(refreshToken: string): Promise<Tokens> {
    const response = await this.apiClient.request<RefreshResponse>('/auth/refresh', {
      body: JSON.stringify({ refreshToken }),
      method: 'POST',
    });
    const tokens: Tokens = {
      accessToken: response.accessToken,
      accessTokenExpiresAt: response.accessTokenExpiresAt,
      refreshToken: response.refreshToken,
    };
    await this.tokenStorage.save(tokens);
    return tokens;
  }
}
