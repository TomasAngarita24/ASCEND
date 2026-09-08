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

function uniqueEmail(): string {
  const email = `ratelimit.${randomUUID()}@ascend.test`;
  testEmails.add(email);
  return email;
}

async function request(path: string, options: RequestInit = {}): Promise<ApiResponse> {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = await response.json() as Record<string, unknown>;
  return { body, status: response.status };
}

function postJson(payload: Record<string, string>): RequestInit {
  return {
    body: JSON.stringify(payload),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  };
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

/**
 * These cases pin mitigation #7: every authentication failure and both rate
 * limits share the same `{ error: { code, message } }` envelope, no failure
 * leaks whether an email is registered, and no path reveals more detail when
 * the account already exists.
 */
describe('authentication failure uniformity', () => {
  it('duplicate registration collapses into the generic registration error', async () => {
    const email = uniqueEmail();
    const first = await request('/auth/register', postJson({ email, password: 'A strong ratelimit test password 2026' }));
    assert.equal(first.status, 201);

    const duplicate = await request('/auth/register', postJson({ email, password: 'A strong ratelimit test password 2026' }));
    assert.equal(duplicate.status, 400);
    assert.deepEqual(duplicate.body.error, {
      code: 'REGISTRATION_REJECTED',
      message: 'The account could not be created.',
    });
  });

  it('per-email credential hammering eventually returns the uniform rate-limit envelope', async () => {
    const email = uniqueEmail();

    let sawRateLimit = false;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const response = await request('/auth/login', postJson({ email, password: 'Deliberately wrong password 2026' }));

      if (response.status === 429) {
        assert.deepEqual(response.body.error, {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please try again later.',
        });
        sawRateLimit = true;
      } else {
        assert.equal(response.status, 401);
        assert.deepEqual(response.body.error, {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password.',
        });
      }
    }

    assert.ok(sawRateLimit, 'repeated login attempts must eventually be rate-limited');
  });

  it('broad unique-email registration spray is rate-limited with the same envelope', async () => {
    let sawSuccess = false;
    let sawRateLimit = false;

    for (let attempt = 0; attempt < 24; attempt += 1) {
      const response = await request('/auth/register', postJson({
        email: uniqueEmail(),
        password: 'A strong ratelimit test password 2026',
      }));

      if (response.status === 429) {
        assert.deepEqual(response.body.error, {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please try again later.',
        });
        sawRateLimit = true;
      } else {
        assert.equal(response.status, 201);
        sawSuccess = true;
      }
    }

    assert.ok(sawSuccess, 'the first registrations should succeed');
    assert.ok(sawRateLimit, 'a registration burst must eventually be rate-limited');
  });
});