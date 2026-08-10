import { randomUUID } from 'node:crypto';
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

import { app } from '../src/app';
import { prisma } from '../src/database/prisma';

interface ApiResponse {
  body: Record<string, unknown>;
  status: number;
}

let baseUrl: string;
let server: Server;
const testEmails = new Set<string>();

function credentials(): { email: string; password: string } {
  const email = `auth.automated.${randomUUID()}@ascend.test`;
  testEmails.add(email);

  return {
    email,
    password: 'A secure automated test password 2026',
  };
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

after(async () => {
  if (testEmails.size > 0) {
    await prisma.user.deleteMany({
      where: { email: { in: [...testEmails] } },
    });
  }

  await stopServer();
  await prisma.$disconnect();
});

describe('authentication', () => {
  it('registers, refreshes, logs out, and invalidates the session', async () => {
    const userCredentials = credentials();
    const register = await request('/auth/register', {
      body: JSON.stringify(userCredentials),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    });

    assert.equal(register.status, 201);

    const registeredUser = register.body.user as Record<string, string>;
    const accessToken = register.body.accessToken as string;
    const refreshToken = register.body.refreshToken as string;

    assert.equal(registeredUser.email, userCredentials.email);
    assert.ok(accessToken);
    assert.ok(refreshToken);

    const profile = await request('/auth/me', {
      headers: { authorization: `Bearer ${accessToken}` },
    });

    assert.equal(profile.status, 200);
    assert.equal((profile.body.user as Record<string, string>).email, userCredentials.email);

    const refresh = await request('/auth/refresh', {
      body: JSON.stringify({ refreshToken }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    });

    assert.equal(refresh.status, 200);

    const nextAccessToken = refresh.body.accessToken as string;
    const nextRefreshToken = refresh.body.refreshToken as string;

    assert.ok(nextAccessToken);
    assert.ok(nextRefreshToken);
    assert.notEqual(nextRefreshToken, refreshToken);

    const reusedRefresh = await request('/auth/refresh', {
      body: JSON.stringify({ refreshToken }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    });

    assert.equal(reusedRefresh.status, 401);
    assert.equal((reusedRefresh.body.error as Record<string, string>).code, 'INVALID_REFRESH_TOKEN');

    const refreshedProfile = await request('/auth/me', {
      headers: { authorization: `Bearer ${nextAccessToken}` },
    });

    assert.equal(refreshedProfile.status, 200);

    const logout = await fetch(`${baseUrl}/auth/logout`, {
      body: JSON.stringify({ refreshToken: nextRefreshToken }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    });

    assert.equal(logout.status, 204);

    const revokedProfile = await request('/auth/me', {
      headers: { authorization: `Bearer ${nextAccessToken}` },
    });

    assert.equal(revokedProfile.status, 401);
    assert.equal((revokedProfile.body.error as Record<string, string>).code, 'UNAUTHORIZED');
  });

  it('rejects an invalid password without revealing account state', async () => {
    const userCredentials = credentials();
    const registration = await request('/auth/register', {
      body: JSON.stringify(userCredentials),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    });

    assert.equal(registration.status, 201);

    const login = await request('/auth/login', {
      body: JSON.stringify({
        email: userCredentials.email,
        password: 'An incorrect password 2026',
      }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    });

    assert.equal(login.status, 401);
    assert.deepEqual(login.body.error, {
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid email or password.',
    });
  });
});
