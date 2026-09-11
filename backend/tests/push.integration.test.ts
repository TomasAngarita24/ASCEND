import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, describe, it } from 'node:test';

import { app } from '../src/app';
import { prisma } from '../src/database/prisma';
import { computeReminderDue } from '../src/modules/push/push.scheduler';

interface ApiResponse {
  body: Record<string, unknown>;
  status: number;
}

let baseUrl: string;
let server: Server;
const testEmails = new Set<string>();

async function request(path: string, options: RequestInit = {}): Promise<ApiResponse> {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = response.status === 204 ? {} : await response.json() as Record<string, unknown>;
  return { body, status: response.status };
}

async function registerUser(label: string): Promise<string> {
  const email = `push.${label}.${randomUUID()}@ascend.test`;
  testEmails.add(email);
  const response = await request('/auth/register', {
    body: JSON.stringify({ email, password: 'A secure automated push test 2026' }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });
  assert.equal(response.status, 201);
  return response.body.accessToken as string;
}

function jsonHeaders(accessToken: string): Record<string, string> {
  return { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' };
}

function fakeSubscription(): { endpoint: string; keys: { p256dh: string; auth: string } } {
  return {
    endpoint: `https://push.example.com/${randomUUID()}`,
    keys: { p256dh: 'BErmhLc', auth: 'V2FlVjNo' },
  };
}

function settings(response: ApiResponse): Record<string, unknown> {
  return response.body.settings as Record<string, unknown>;
}

before(async () => {
  server = app.listen(0);
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.once('listening', resolve);
  });
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  if (testEmails.size > 0) {
    await prisma.user.deleteMany({ where: { email: { in: [...testEmails] } } });
  }
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  await prisma.$disconnect();
});

describe('push settings', () => {
  it('returns defaults, persists changes, and rejects invalid payloads', async () => {
    const accessToken = await registerUser('settings');
    const headers = jsonHeaders(accessToken);

    const initial = await request('/push/settings', { headers });
    assert.equal(initial.status, 200);
    assert.equal(settings(initial).reminderEnabled, false);
    assert.equal(settings(initial).reminderHour, null);
    assert.equal(settings(initial).subscribed, false);

    const saved = await request('/push/settings', {
      body: JSON.stringify({
        reminderEnabled: true,
        reminderHour: 18,
        reminderMinute: 30,
        reminderTzOffsetMin: 60,
      }),
      headers,
      method: 'PUT',
    });
    assert.equal(saved.status, 200);
    assert.equal(settings(saved).reminderEnabled, true);
    assert.equal(settings(saved).reminderHour, 18);
    assert.equal(settings(saved).reminderMinute, 30);
    assert.equal(settings(saved).reminderTzOffsetMin, 60);

    const reloaded = await request('/push/settings', { headers });
    assert.deepEqual(
      {
        reminderEnabled: settings(reloaded).reminderEnabled,
        reminderHour: settings(reloaded).reminderHour,
        reminderMinute: settings(reloaded).reminderMinute,
        reminderTzOffsetMin: settings(reloaded).reminderTzOffsetMin,
      },
      { reminderEnabled: true, reminderHour: 18, reminderMinute: 30, reminderTzOffsetMin: 60 },
    );

    const badHour = await request('/push/settings', {
      body: JSON.stringify({ reminderEnabled: true, reminderHour: 24, reminderMinute: 0, reminderTzOffsetMin: 0 }),
      headers,
      method: 'PUT',
    });
    assert.equal(badHour.status, 400);
    assert.equal((badHour.body.error as Record<string, string>).code, 'VALIDATION_ERROR');

    const unknownField = await request('/push/settings', {
      body: JSON.stringify({ reminderEnabled: true, secretField: 'x' }),
      headers,
      method: 'PUT',
    });
    assert.equal(unknownField.status, 400);

    const unauthenticated = await request('/push/settings');
    assert.equal(unauthenticated.status, 401);
    assert.equal((unauthenticated.body.error as Record<string, string>).code, 'UNAUTHORIZED');
  });
});

describe('push subscriptions', () => {
  it('saves, upserts, deletes, and scopes subscriptions per user', async () => {
    const ownerToken = await registerUser('owner');
    const ownerHeaders = jsonHeaders(ownerToken);
    const strangerToken = await registerUser('stranger');
    const strangerHeaders = jsonHeaders(strangerToken);

    const subscription = fakeSubscription();

    const created = await request('/push/subscriptions', {
      body: JSON.stringify(subscription),
      headers: ownerHeaders,
      method: 'POST',
    });
    assert.equal(created.status, 201);
    const createdId = (created.body.subscription as Record<string, string>).id;

    const resubscribed = await request('/push/subscriptions', {
      body: JSON.stringify(subscription),
      headers: ownerHeaders,
      method: 'POST',
    });
    assert.equal(resubscribed.status, 201);
    assert.equal((resubscribed.body.subscription as Record<string, string>).id, createdId);

    const subscribed = await request('/push/settings', { headers: ownerHeaders });
    assert.equal(settings(subscribed).subscribed, true);

    // A different user can never see the subscription.
    const strangerSettings = await request('/push/settings', { headers: strangerHeaders });
    assert.equal(settings(strangerSettings).subscribed, false);

    // Deleting with an endpoint that does not belong to the caller is a no-op.
    const noOpDelete = await request('/push/subscriptions', {
      body: JSON.stringify({ endpoint: subscription.endpoint }),
      headers: strangerHeaders,
      method: 'DELETE',
    });
    assert.equal(noOpDelete.status, 204);

    const stillSubscribed = await request('/push/settings', { headers: ownerHeaders });
    assert.equal(settings(stillSubscribed).subscribed, true);

    const removed = await request('/push/subscriptions', {
      body: JSON.stringify({ endpoint: subscription.endpoint }),
      headers: ownerHeaders,
      method: 'DELETE',
    });
    assert.equal(removed.status, 204);

    const afterDelete = await request('/push/settings', { headers: ownerHeaders });
    assert.equal(settings(afterDelete).subscribed, false);
  });

  it('rejects malformed subscription payloads and unauthenticated calls', async () => {
    const accessToken = await registerUser('validation');
    const headers = jsonHeaders(accessToken);

    const missingKeys = await request('/push/subscriptions', {
      body: JSON.stringify({ endpoint: 'https://push.example.com/x' }),
      headers,
      method: 'POST',
    });
    assert.equal(missingKeys.status, 400);
    assert.equal((missingKeys.body.error as Record<string, string>).code, 'VALIDATION_ERROR');

    const badEndpoint = await request('/push/subscriptions', {
      body: JSON.stringify({ endpoint: 'not-a-url', keys: { p256dh: 'a', auth: 'b' } }),
      headers,
      method: 'POST',
    });
    assert.equal(badEndpoint.status, 400);

    const unauthenticated = await request('/push/subscriptions', { method: 'POST' });
    assert.equal(unauthenticated.status, 401);
  });
});

describe('rest-end push scheduling', () => {
  it('schedules and cancels without exposing another user’s timers', async () => {
    const accessToken = await registerUser('rest');
    const headers = jsonHeaders(accessToken);

    const scheduled = await request('/push/rest', {
      body: JSON.stringify({ seconds: 90 }),
      headers,
      method: 'POST',
    });
    assert.equal(scheduled.status, 204);

    const cancelled = await request('/push/rest', { headers, method: 'DELETE' });
    assert.equal(cancelled.status, 204);

    const tooShort = await request('/push/rest', {
      body: JSON.stringify({ seconds: 1 }),
      headers,
      method: 'POST',
    });
    assert.equal(tooShort.status, 400);

    const outOfRange = await request('/push/rest', {
      body: JSON.stringify({ seconds: 5000 }),
      headers,
      method: 'POST',
    });
    assert.equal(outOfRange.status, 400);

    const unauthenticated = await request('/push/rest', { method: 'POST' });
    assert.equal(unauthenticated.status, 401);
  });
});

describe('computeReminderDue', () => {
  const offset = 60; // UTC+1
  const dueMs = new Date('2026-09-10T07:30:00.000Z').getTime(); // 08:30 local (UTC+1)

  it('returns the due instant inside the firing window', () => {
    assert.equal(computeReminderDue(dueMs, 8, 30, offset), dueMs);
    // One minute into the window still fires.
    assert.equal(computeReminderDue(dueMs + 60_000, 8, 30, offset), dueMs);
    // One second before the targeted time must not fire yet.
    assert.equal(computeReminderDue(dueMs - 1000, 8, 30, offset), null);
    // Six minutes after the targeted time is outside the grace window.
    assert.equal(computeReminderDue(dueMs + 6 * 60_000, 8, 30, offset), null);
  });

  it('normalizes boundaries across offsets', () => {
    assert.equal(computeReminderDue(dueMs, 8, 30, offset), dueMs);
    // A UTC user targets 08:30 UTC: the same instant is still an hour away.
    assert.equal(computeReminderDue(dueMs, 8, 30, 0), null);
    assert.equal(computeReminderDue(dueMs + 60 * 60_000, 8, 30, 0), dueMs + 60 * 60_000);
  });
});