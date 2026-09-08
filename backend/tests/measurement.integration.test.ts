import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, describe, it } from 'node:test';

import { app } from '../src/app';
import { prisma } from '../src/database/prisma';

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
  const email = `measurement.${label}.${randomUUID()}@ascend.test`;
  testEmails.add(email);
  const response = await request('/auth/register', {
    body: JSON.stringify({ email, password: 'A secure automated measurement test 2026' }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });
  assert.equal(response.status, 201);
  return response.body.accessToken as string;
}

function jsonHeaders(accessToken: string): Record<string, string> {
  return { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' };
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

describe('measurements', () => {
  it('saves, upserts, lists, and deletes body measurements', async () => {
    const accessToken = await registerUser('flow');
    const headers = jsonHeaders(accessToken);

    const created = await request('/measurements', {
      body: JSON.stringify({ date: '2026-06-01', weight: 82.5, waist: 88 }),
      headers,
      method: 'POST',
    });
    assert.equal(created.status, 200);
    const firstMeasurement = created.body.measurement as Record<string, unknown>;
    assert.equal(firstMeasurement.date, '2026-06-01');
    assert.equal(firstMeasurement.weight, 82.5);
    assert.equal(firstMeasurement.waist, 88);

    // Same date upserts instead of creating a duplicate.
    const upserted = await request('/measurements', {
      body: JSON.stringify({ date: '2026-06-01', weight: 81, waist: 88 }),
      headers,
      method: 'POST',
    });
    assert.equal(upserted.status, 200);
    assert.equal((upserted.body.measurement as Record<string, unknown>).weight, 81);

    const second = await request('/measurements', {
      body: JSON.stringify({ date: '2026-06-15', weight: 80.5 }),
      headers,
      method: 'POST',
    });
    assert.equal(second.status, 200);
    const secondMeasurement = second.body.measurement as Record<string, unknown>;

    const list = await request('/measurements', { headers });
    assert.equal(list.status, 200);
    const entries = list.body.data as Array<Record<string, unknown>>;
    assert.equal(entries.length, 2);
    // Ordered by date descending.
    assert.equal(entries[0].id, secondMeasurement.id);
    assert.equal(entries[1].id, firstMeasurement.id);
    // The upserted weight persisted for 2026-06-01.
    const firstListed = entries.find((entry) => entry.date === '2026-06-01');
    assert.equal(firstListed?.weight, 81);

    const removed = await request(`/measurements/${secondMeasurement.id}`, { headers, method: 'DELETE' });
    assert.equal(removed.status, 204);

    const afterDelete = await request('/measurements', { headers });
    assert.equal((afterDelete.body.data as Array<unknown>).length, 1);

    const missing = await request(`/measurements/${secondMeasurement.id}`, { headers, method: 'DELETE' });
    assert.equal(missing.status, 404);
    assert.equal((missing.body.error as Record<string, string>).code, 'MEASUREMENT_NOT_FOUND');
  });

  it('rejects invalid measurement payloads', async () => {
    const accessToken = await registerUser('validation');
    const headers = jsonHeaders(accessToken);

    const empty = await request('/measurements', { body: '{}', headers, method: 'POST' });
    assert.equal(empty.status, 400);
    assert.equal((empty.body.error as Record<string, string>).code, 'VALIDATION_ERROR');

    const badDate = await request('/measurements', {
      body: JSON.stringify({ date: 'not-a-date', weight: 80 }),
      headers,
      method: 'POST',
    });
    assert.equal(badDate.status, 400);

    const negative = await request('/measurements', {
      body: JSON.stringify({ date: '2026-06-01', weight: -5 }),
      headers,
      method: 'POST',
    });
    assert.equal(negative.status, 400);

    const outOfRange = await request('/measurements', {
      body: JSON.stringify({ date: '2026-06-01', bodyFat: 100 }),
      headers,
      method: 'POST',
    });
    assert.equal(outOfRange.status, 400);

    const unknownField = await request('/measurements', {
      body: JSON.stringify({ date: '2026-06-01', weight: 80, secretField: 'x' }),
      headers,
      method: 'POST',
    });
    assert.equal(unknownField.status, 400);

    const authenticated = await request('/measurements');
    assert.equal(authenticated.status, 401);
    assert.equal((authenticated.body.error as Record<string, string>).code, 'UNAUTHORIZED');
  });

  it('does not expose measurements to another user', async () => {
    const ownerToken = await registerUser('owner');
    const ownerHeaders = jsonHeaders(ownerToken);
    const created = await request('/measurements', {
      body: JSON.stringify({ date: '2026-06-01', weight: 82.5 }),
      headers: ownerHeaders,
      method: 'POST',
    });
    assert.equal(created.status, 200);
    const measurementId = (created.body.measurement as Record<string, string>).id;

    const strangerToken = await registerUser('stranger');
    const strangerHeaders = jsonHeaders(strangerToken);

    const list = await request('/measurements', { headers: strangerHeaders });
    assert.equal(list.status, 200);
    assert.deepEqual(list.body.data, []);

    const removed = await request(`/measurements/${measurementId}`, { headers: strangerHeaders, method: 'DELETE' });
    assert.equal(removed.status, 404);
    assert.equal((removed.body.error as Record<string, string>).code, 'MEASUREMENT_NOT_FOUND');
  });
});