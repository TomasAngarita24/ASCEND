import { randomUUID } from 'node:crypto';
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

import { app } from '../src/app';
import { prisma } from '../src/database/prisma';
import { setEmailVerificationLinkHandler } from '../src/modules/auth/email.service';

interface ApiResponse {
  body: Record<string, unknown>;
  headers: Headers;
  status: number;
}

let baseUrl: string;
let server: Server;
const testEmails = new Set<string>();

function credentials(): { email: string; password: string } {
  const email = `verify.automated.${randomUUID()}@ascend.test`;
  testEmails.add(email);

  return {
    email,
    password: 'A secure automated test password 2026',
  };
}

async function request(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse> {
  const response = await fetch(`${baseUrl}${path}`, options);
  let body: Record<string, unknown> = {};
  try {
    body = (await response.json()) as Record<string, unknown>;
  } catch {
    // empty body
  }

  return { body, headers: response.headers, status: response.status };
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

describe('email verification', () => {
  before(async () => {
    await startServer();
  });

  after(async () => {
    setEmailVerificationLinkHandler(null);
    if (testEmails.size > 0) {
      await prisma.user.deleteMany({
        where: { email: { in: Array.from(testEmails) } },
      });
    }
    await stopServer();
  });

  it('completes the registration, token verification, and resend verification flow', async () => {
    let capturedVerifyUrl: string | null = null;
    setEmailVerificationLinkHandler((_email, verifyUrl) => {
      capturedVerifyUrl = verifyUrl;
    });

    const creds = credentials();

    // 1. Register new user
    const regRes = await request('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(creds),
    });

    assert.equal(regRes.status, 201);
    const user = regRes.body.user as { id: string; emailVerified: boolean };
    assert.equal(user.emailVerified, false);
    const accessToken = regRes.body.accessToken as string;

    assert.ok(capturedVerifyUrl, 'Verification URL should be sent');
    const urlObj = new URL(capturedVerifyUrl);
    const token = urlObj.searchParams.get('token');
    assert.ok(token, 'Token parameter must be present');

    // 2. Resend verification email
    let resendCapturedUrl: string | null = null;
    setEmailVerificationLinkHandler((_email, verifyUrl) => {
      resendCapturedUrl = verifyUrl;
    });

    const resendRes = await request('/auth/resend-verification', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    assert.equal(resendRes.status, 204);
    assert.ok(resendCapturedUrl, 'Resent verification URL should be sent');
    const newToken = new URL(resendCapturedUrl).searchParams.get('token');
    assert.ok(newToken);

    // 3. Verify email using the token
    const verifyRes = await request('/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: newToken }),
    });

    assert.equal(verifyRes.status, 204);

    // 4. Fetch authenticated user profile to confirm emailVerified is now true
    const meRes = await request('/auth/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    assert.equal(meRes.status, 200);
    const updatedUser = meRes.body.user as { emailVerified: boolean };
    assert.equal(updatedUser.emailVerified, true);
  });

  it('rejects an invalid or non-existent verification token', async () => {
    const res = await request('/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'invalid_token_12345' }),
    });

    assert.equal(res.status, 400);
    assert.equal((res.body.error as Record<string, string>).code, 'INVALID_VERIFICATION_TOKEN');
  });
});
