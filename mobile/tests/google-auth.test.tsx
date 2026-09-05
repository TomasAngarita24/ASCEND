import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AuthService } from '../src/features/auth/auth.service';
import { AuthScreen } from '../src/features/auth/auth-screen';
import { ApiClient } from '../src/lib/api-client';
import { TokenStorage } from '../src/features/auth/token-storage';

jest.setTimeout(15000);

describe('Google Authentication (Mobile)', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    jest.resetAllMocks();
    global.fetch = originalFetch;
  });

  it('authenticates with Google ID token and saves tokens', async () => {
    const mockStorage = {
      save: jest.fn().mockResolvedValue(undefined),
      read: jest.fn().mockResolvedValue(null),
      clear: jest.fn().mockResolvedValue(undefined),
    } as unknown as TokenStorage;

    const mockResponse = {
      user: { id: 'usr_123', email: 'google.user@example.com', createdAt: '2026-08-21T00:00:00Z' },
      accessToken: 'jwt.access.token',
      accessTokenExpiresAt: '2026-08-21T00:15:00Z',
      refreshToken: 'refresh.token.123',
    };

    const fetchMock = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(mockResponse),
    } as Response);

    global.fetch = fetchMock as typeof fetch;

    const client = new ApiClient('http://10.0.2.2:3000');
    const authService = new AuthService(client, mockStorage);

    const session = await authService.loginWithGoogle('mock-google-id-token');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://10.0.2.2:3000/auth/google',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ idToken: 'mock-google-id-token' }),
      }),
    );

    expect(mockStorage.save).toHaveBeenCalledWith({
      accessToken: 'jwt.access.token',
      accessTokenExpiresAt: '2026-08-21T00:15:00Z',
      refreshToken: 'refresh.token.123',
    });

    expect(session.user.email).toBe('google.user@example.com');
  });

  it('renders Google sign-in button on AuthScreen and triggers sign-in flow', async () => {
    const mockStorage = {
      save: jest.fn().mockResolvedValue(undefined),
      read: jest.fn().mockResolvedValue(null),
      clear: jest.fn().mockResolvedValue(undefined),
    } as unknown as TokenStorage;

    const client = new ApiClient('http://10.0.2.2:3000');
    const authService = new AuthService(client, mockStorage);
    const onAuthenticated = jest.fn();
    const onGoogleSignIn = jest.fn().mockResolvedValue('mock-google-id-token');

    const mockResponse = {
      user: { id: 'usr_123', email: 'google.user@example.com', createdAt: '2026-08-21T00:00:00Z' },
      accessToken: 'jwt.access.token',
      accessTokenExpiresAt: '2026-08-21T00:15:00Z',
      refreshToken: 'refresh.token.123',
    };

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(mockResponse),
    } as Response) as typeof fetch;

    const { getByText } = render(
      <AuthScreen
        authService={authService}
        onAuthenticated={onAuthenticated}
        onGoogleSignIn={onGoogleSignIn}
      />,
    );

    const googleButton = getByText('Continuar con Google');
    expect(googleButton).toBeTruthy();

    fireEvent.press(googleButton);

    await waitFor(() => {
      expect(onGoogleSignIn).toHaveBeenCalledTimes(1);
      expect(onAuthenticated).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.objectContaining({ email: 'google.user@example.com' }),
        }),
      );
    });
  });
});
