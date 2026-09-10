import { randomUUID } from 'node:crypto';
import { after, afterEach, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

import { app } from '../src/app';
import { prisma } from '../src/database/prisma';
import { setGoogleTokenVerifier } from '../src/modules/auth/google.service';
import { authenticateWithGoogle, login, register } from '../src/modules/auth/auth.service';
import { HttpError } from '../src/errors/http-error';

interface ApiResponse {
  body: Record<string, unknown>;
  status: number;
}

let baseUrl: string;
let server: Server;
const testEmails = new Set<string>();

function uniqueEmail(): string {
  const email = `google.test.${randomUUID()}@ascend.test`;
  testEmails.add(email);
  return email;
}

async function request(
  path: string,
  options: RequestInit = {},
): Promise<ApiResponse> {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = await response.json() as Record<string, unknown>;
  return { body, status: response.status };
}

async function startServer(): Promise<void> {
  server = app.listen(0);
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.once('listening', resolve);
  });
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}`;
}

async function stopServer(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

before(startServer);

afterEach(() => {
  setGoogleTokenVerifier(null);
});

after(async () => {
  setGoogleTokenVerifier(null);
  if (testEmails.size > 0) {
    await prisma.user.deleteMany({
      where: { email: { in: [...testEmails] } },
    });
  }
  await stopServer();
  await prisma.$disconnect();
});

describe('Google Authentication', () => {
  it('rejects missing or invalid Google ID tokens', async () => {
    const emptyRequest = await request('/auth/google', {
      body: JSON.stringify({}),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    });
    assert.equal(emptyRequest.status, 400);

    const invalidTokenRequest = await request('/auth/google', {
      body: JSON.stringify({ idToken: 'invalid.token.payload' }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    });
    assert.equal(invalidTokenRequest.status, 401);
    assert.equal((invalidTokenRequest.body.error as Record<string, string>).code, 'INVALID_GOOGLE_TOKEN');
  });

  it('creates a new user when signing in with Google for the first time (Case 3)', async () => {
    const email = uniqueEmail();
    const googleId = `gid_${randomUUID()}`;

    setGoogleTokenVerifier(async () => ({
      email,
      googleId,
    }));

    const response = await request('/auth/google', {
      body: JSON.stringify({ idToken: 'valid-google-id-token' }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    });

    assert.equal(response.status, 200);

    const registeredUser = response.body.user as Record<string, string>;
    const accessToken = response.body.accessToken as string;

    assert.equal(registeredUser.email, email);
    assert.ok(accessToken);
    assert.equal(
      response.body.refreshToken,
      undefined,
      'the refresh token must only travel in the httpOnly cookie, never in the response body',
    );

    // Verify user in DB has googleId and null passwordHash
    const userInDb = await prisma.user.findUnique({ where: { email } });
    assert.ok(userInDb);
    assert.equal(userInDb.googleId, googleId);
    assert.equal(userInDb.passwordHash, null);

    // Verify authenticated session works
    const profile = await request('/auth/me', {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    assert.equal(profile.status, 200);
    assert.equal((profile.body.user as Record<string, string>).email, email);
  });

  it('logs in existing user with googleId without creating a duplicate (Case 1)', async () => {
    const email = uniqueEmail();
    const googleId = `gid_${randomUUID()}`;

    setGoogleTokenVerifier(async () => ({
      email,
      googleId,
    }));

    // First sign-in creates the account
    const firstRes = await request('/auth/google', {
      body: JSON.stringify({ idToken: 'valid-google-id-token' }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    });
    assert.equal(firstRes.status, 200);
    const firstUserId = (firstRes.body.user as Record<string, string>).id;

    // Second sign-in logs into the same account
    const secondRes = await request('/auth/google', {
      body: JSON.stringify({ idToken: 'valid-google-id-token' }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    });
    assert.equal(secondRes.status, 200);
    const secondUserId = (secondRes.body.user as Record<string, string>).id;

    assert.equal(firstUserId, secondUserId);

    // Verify only 1 user exists in DB with this email
    const users = await prisma.user.findMany({ where: { email } });
    assert.equal(users.length, 1);
  });

  it('links Google account to an existing local user with matching email (Case 2)', async () => {
    const email = uniqueEmail();
    const password = 'LocalPassword123!';
    const googleId = `gid_${randomUUID()}`;

    // Register local account first
    const localRegister = await register({ email, password });
    assert.ok(localRegister.user.id);

    setGoogleTokenVerifier(async () => ({
      email,
      googleId,
    }));

    // Authenticate with Google using same email
    const googleRes = await request('/auth/google', {
      body: JSON.stringify({ idToken: 'valid-google-id-token' }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    });

    assert.equal(googleRes.status, 200);
    const googleUser = googleRes.body.user as Record<string, string>;
    assert.equal(googleUser.id, localRegister.user.id);
    assert.equal(googleUser.email, email);

    // Verify user in DB has both passwordHash and googleId
    const userInDb = await prisma.user.findUnique({ where: { email } });
    assert.ok(userInDb);
    assert.equal(userInDb.googleId, googleId);
    assert.ok(userInDb.passwordHash);

    // Traditional password login still works
    const localLogin = await login({ email, password });
    assert.equal(localLogin.user.id, localRegister.user.id);
  });

  it('rejects password login for accounts created exclusively via Google', async () => {
    const email = uniqueEmail();
    const googleId = `gid_${randomUUID()}`;

    setGoogleTokenVerifier(async () => ({
      email,
      googleId,
    }));

    await authenticateWithGoogle('valid-google-id-token');

    // Attempting to log in with password should fail with generic invalid credentials
    await assert.rejects(
      async () => login({ email, password: 'AnyPassword123!' }),
      (err: unknown) => {
        assert.ok(err instanceof HttpError);
        assert.equal(err.statusCode, 401);
        assert.equal(err.code, 'INVALID_CREDENTIALS');
        return true;
      },
    );
  });

  it('rejects Google authentication when email is not verified (Case 6)', async () => {
    setGoogleTokenVerifier(async () => {
      throw new HttpError(400, 'UNVERIFIED_GOOGLE_EMAIL', 'Google account email is not verified.');
    });

    const response = await request('/auth/google', {
      body: JSON.stringify({ idToken: 'unverified-email-token' }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    });

    assert.equal(response.status, 400);
    assert.equal((response.body.error as Record<string, string>).code, 'UNVERIFIED_GOOGLE_EMAIL');
  });

  it('rejects Google authentication on expired or malformed token (Cases 4 & 5)', async () => {
    setGoogleTokenVerifier(async () => {
      throw new HttpError(401, 'INVALID_GOOGLE_TOKEN', 'Google ID token is invalid or expired.');
    });

    const response = await request('/auth/google', {
      body: JSON.stringify({ idToken: 'expired-token' }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    });

    assert.equal(response.status, 401);
    assert.equal((response.body.error as Record<string, string>).code, 'INVALID_GOOGLE_TOKEN');
  });
});
