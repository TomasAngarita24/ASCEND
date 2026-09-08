import { randomUUID } from 'node:crypto';
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

import { app } from '../src/app';
import { prisma } from '../src/database/prisma';

let baseUrl: string;
let server: Server;
const testEmails = new Set<string>();

function credentials(): { email: string; password: string } {
  const email = `cookies.automated.${randomUUID()}@ascend.test`;
  testEmails.add(email);

  return {
    email,
    password: 'A secure automated test password 2026',
  };
}

function cookieHeader(cookieMap: Map<string, string>): string {
  return [...cookieMap.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
}

function readSetCookies(response: Response): { name: string; value: string; flags: string }[] {
  return response.headers.getSetCookie().map((raw) => {
    const [pair, ...rest] = raw.split(';').map((part) => part.trim());
    const separatorIndex = pair.indexOf('=');
    return {
      name: pair.slice(0, separatorIndex),
      value: pair.slice(separatorIndex + 1),
      flags: rest.join(', ').toLowerCase(),
    };
  });
}

async function authenticatedFetch(
  path: string,
  options: RequestInit & { method?: string; body?: unknown } = {},
  cookies: Map<string, string>,
): Promise<Response> {
  const init: RequestInit = {
    ...options,
    method: options.method ?? 'GET',
    headers: {
      ...(options.body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(cookies.size > 0 ? { cookie: cookieHeader(cookies) } : {}),
      ...(options.headers),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  };
  const response = await fetch(`${baseUrl}${path}`, init);

  for (const cookie of readSetCookies(response)) {
    if (cookie.flags.includes('httponly') || cookie.flags.includes('max-age=0')) {
      cookies.set(cookie.name, cookie.value);
    }
  }
  return response;
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
    await prisma.user.deleteMany({ where: { email: { in: [...testEmails] } } });
  }
  await stopServer();
});

describe('httpOnly cookie session flow', () => {
  it('issues httpOnly cookies and authenticates subsequent requests with them', async () => {
    const { email, password } = credentials();
    const cookies = new Map<string, string>();

    const registration = await authenticatedFetch(
      '/auth/register',
      { method: 'POST', body: { email, password } },
      cookies,
    );
    assert.equal(registration.status, 201);

    assert.ok(cookies.has('ascend_access'), 'access cookie should have been set');
    assert.ok(cookies.has('ascend_refresh'), 'refresh cookie should have been set');

    const rawCookies = registration.headers.getSetCookie();
    assert.ok(rawCookies.some((c) => c.toLowerCase().includes('httponly')), 'cookies must be httpOnly');
    assert.ok(rawCookies.some((c) => c.toLowerCase().includes('samesite=lax')), 'cookies must be SameSite=Lax');

    const profile = await authenticatedFetch('/auth/me', {}, cookies);
    assert.equal(profile.status, 200);

    const rotation = await authenticatedFetch('/auth/refresh', { method: 'POST' }, cookies);
    assert.equal(rotation.status, 200);
    assert.ok(cookies.has('ascend_access'), 'refresh should renew the access cookie');
    assert.ok(cookies.has('ascend_refresh'), 'refresh should rotate the refresh cookie');

    const refreshedProfile = await authenticatedFetch('/auth/me', {}, cookies);
    assert.equal(refreshedProfile.status, 200);
  });

  it('logs out by invalidating the session and clearing cookies', async () => {
    const { email, password } = credentials();
    const cookies = new Map<string, string>();

    const registration = await authenticatedFetch(
      '/auth/register',
      { method: 'POST', body: { email, password } },
      cookies,
    );
    assert.equal(registration.status, 201);

    const logout = await authenticatedFetch('/auth/logout', { method: 'POST' }, cookies);
    assert.equal(logout.status, 204);

    const stale = await authenticatedFetch('/auth/me', {}, cookies);
    assert.equal(stale.status, 401);

    const refusedRefresh = await authenticatedFetch('/auth/refresh', { method: 'POST' }, cookies);
    assert.equal(refusedRefresh.status, 401);
  });

  it('invalidates the current session cookies after a password change', async () => {
    const { email, password } = credentials();
    const cookies = new Map<string, string>();

    const registration = await authenticatedFetch(
      '/auth/register',
      { method: 'POST', body: { email, password } },
      cookies,
    );
    assert.equal(registration.status, 201);

    const change = await authenticatedFetch(
      '/auth/me/password',
      {
        method: 'PATCH',
        body: { currentPassword: password, newPassword: 'A freshly changed password 2026' },
      },
      cookies,
    );
    assert.equal(change.status, 204);

    // changePassword revokes every session, so the old cookies stop working.
    const staleProfile = await authenticatedFetch('/auth/me', {}, cookies);
    assert.equal(staleProfile.status, 401);

    const staleRefresh = await authenticatedFetch('/auth/refresh', { method: 'POST' }, cookies);
    assert.equal(staleRefresh.status, 401);
  });
});