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

async function registerAndGetAccessToken(): Promise<string> {
  const email = `sync.automated.${randomUUID()}@ascend.test`;
  testEmails.add(email);
  const response = await request('/auth/register', {
    body: JSON.stringify({ email, password: 'A secure automated test password 2026' }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });

  assert.equal(response.status, 201);
  return response.body.accessToken as string;
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

describe('Cloud Sync: Profile, Routine Folders, and Body Measurements', () => {
  it('updates profile info and returns it on /auth/me', async () => {
    const token = await registerAndGetAccessToken();
    const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };

    const updateRes = await request('/auth/me', {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ fullName: 'Tomas Tester', bio: 'Powerlifter & Dev' }),
    });

    assert.equal(updateRes.status, 200);
    const user = updateRes.body.user as Record<string, unknown>;
    assert.equal(user.fullName, 'Tomas Tester');
    assert.equal(user.bio, 'Powerlifter & Dev');

    const meRes = await request('/auth/me', { headers });
    assert.equal(meRes.status, 200);
    const meUser = meRes.body.user as Record<string, unknown>;
    assert.equal(meUser.fullName, 'Tomas Tester');
  });

  it('manages routine folders and associates routines with folders', async () => {
    const token = await registerAndGetAccessToken();
    const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };

    // Create routine
    const routineRes = await request('/routines', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: 'Push Day A' }),
    });
    assert.equal(routineRes.status, 201);
    const routineId = (routineRes.body.routine as Record<string, unknown>).id as string;

    // Create folder
    const folderRes = await request('/routines/folders', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: 'PPL Hypertrophy' }),
    });
    assert.equal(folderRes.status, 201);
    const folderId = (folderRes.body.folder as Record<string, unknown>).id as string;

    // Move routine to folder
    const moveRes = await request(`/routines/${routineId}/folder`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ folderId }),
    });
    assert.equal(moveRes.status, 200);

    // List folders
    const listFoldersRes = await request('/routines/folders', { headers });
    assert.equal(listFoldersRes.status, 200);
    const folders = listFoldersRes.body.data as Array<Record<string, unknown>>;
    assert.equal(folders.length, 1);
    assert.equal(folders[0].name, 'PPL Hypertrophy');
    assert.deepEqual(folders[0].routineIds, [routineId]);

    // Rename folder
    const renameRes = await request(`/routines/folders/${folderId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ name: 'Push Pull Legs' }),
    });
    assert.equal(renameRes.status, 200);

    // Delete folder
    const deleteFolderRes = await request(`/routines/folders/${folderId}`, {
      method: 'DELETE',
      headers,
    });
    assert.equal(deleteFolderRes.status, 204);

    // Routine still exists, but folderId is null
    const routineCheck = await request(`/routines/${routineId}`, { headers });
    assert.equal(routineCheck.status, 200);
    assert.equal((routineCheck.body.routine as Record<string, unknown>).folderId, null);
  });

  it('records, retrieves, and deletes body measurements', async () => {
    const token = await registerAndGetAccessToken();
    const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };

    // Save measurement
    const saveRes = await request('/measurements', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        date: '2026-09-01',
        weight: 78.5,
        waist: 82,
        chest: 104,
      }),
    });
    assert.equal(saveRes.status, 200);
    const measurementId = (saveRes.body.measurement as Record<string, unknown>).id as string;

    // Upsert update on same date
    const updateRes = await request('/measurements', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        date: '2026-09-01',
        weight: 78.2,
      }),
    });
    assert.equal(updateRes.status, 200);
    const updated = updateRes.body.measurement as Record<string, unknown>;
    assert.equal(updated.weight, 78.2);
    assert.equal(updated.waist, 82); // preserved

    // List measurements
    const listRes = await request('/measurements', { headers });
    assert.equal(listRes.status, 200);
    const list = listRes.body.data as Array<Record<string, unknown>>;
    assert.equal(list.length, 1);
    assert.equal(list[0].date, '2026-09-01');

    // Delete measurement
    const delRes = await request(`/measurements/${measurementId}`, {
      method: 'DELETE',
      headers,
    });
    assert.equal(delRes.status, 204);

    const listEmptyRes = await request('/measurements', { headers });
    assert.equal(listEmptyRes.status, 200);
    assert.equal((listEmptyRes.body.data as unknown[]).length, 0);
  });

  it('rejects out-of-range measurement values and invalid ids', async () => {
    const token = await registerAndGetAccessToken();
    const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };

    const oversized = await request('/measurements', {
      method: 'POST',
      headers,
      body: JSON.stringify({ date: '2026-09-02', weight: 1e10 }),
    });
    assert.equal(oversized.status, 400);

    const invalidDelete = await request('/measurements/not-a-uuid', {
      method: 'DELETE',
      headers,
    });
    assert.equal(invalidDelete.status, 400);

    const validDelete = await request('/measurements/00000000-0000-0000-0000-000000000000', {
      method: 'DELETE',
      headers,
    });
    assert.equal(validDelete.status, 404);
    assert.equal((validDelete.body.error as Record<string, string>).code, 'MEASUREMENT_NOT_FOUND');
  });

  it('rejects folder names over the 255 character limit', async () => {
    const token = await registerAndGetAccessToken();
    const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };

    const oversized = await request('/routines/folders', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: 'X'.repeat(256) }),
    });
    assert.equal(oversized.status, 400);
  });
});
