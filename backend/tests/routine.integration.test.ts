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
  const email = `routine.automated.${randomUUID()}@ascend.test`;
  testEmails.add(email);
  const response = await request('/auth/register', {
    body: JSON.stringify({ email, password: 'A secure automated test password 2026' }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });

  assert.equal(response.status, 201);
  return response.body.accessToken as string;
}

async function createExercise(accessToken: string): Promise<string> {
  const response = await request('/exercises', {
    body: JSON.stringify({ name: `Routine exercise ${randomUUID()}` }),
    headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
    method: 'POST',
  });

  assert.equal(response.status, 201);
  return (response.body.exercise as Record<string, string>).id;
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

describe('routines', () => {
  it('creates, configures, reorders, duplicates, and deletes a routine', async () => {
    const accessToken = await registerAndGetAccessToken();
    const headers = { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' };
    const firstExerciseId = await createExercise(accessToken);
    const secondExerciseId = await createExercise(accessToken);

    const creation = await request('/routines', {
      body: JSON.stringify({ name: 'Automated push day' }), headers, method: 'POST',
    });
    assert.equal(creation.status, 201);
    const routineId = (creation.body.routine as Record<string, string>).id;

    const firstAddition = await request(`/routines/${routineId}/exercises`, {
      body: JSON.stringify({ exerciseId: firstExerciseId, targetSets: 3, targetRepetitionsMin: 8, targetRepetitionsMax: 12 }),
      headers, method: 'POST',
    });
    assert.equal(firstAddition.status, 201);
    const firstRoutineExerciseId = (firstAddition.body.routineExercise as Record<string, string>).id;

    const secondAddition = await request(`/routines/${routineId}/exercises`, {
      body: JSON.stringify({ exerciseId: secondExerciseId, position: 1, restSeconds: 120 }), headers, method: 'POST',
    });
    assert.equal(secondAddition.status, 201);
    const secondRoutineExerciseId = (secondAddition.body.routineExercise as Record<string, string>).id;

    const reordered = await request(`/routines/${routineId}/exercises/reorder`, {
      body: JSON.stringify({ routineExerciseIds: [firstRoutineExerciseId, secondRoutineExerciseId] }), headers, method: 'POST',
    });
    assert.equal(reordered.status, 200);
    const reorderedExercises = ((reordered.body.routine as Record<string, unknown>).exercises as Array<Record<string, unknown>>);
    assert.deepEqual(reorderedExercises.map((item) => item.id), [firstRoutineExerciseId, secondRoutineExerciseId]);
    assert.deepEqual(reorderedExercises.map((item) => item.position), [1, 2]);

    const duplicate = await request(`/routines/${routineId}/duplicate`, { headers, method: 'POST' });
    assert.equal(duplicate.status, 201);
    const duplicatedRoutine = duplicate.body.routine as Record<string, unknown>;
    assert.equal(duplicatedRoutine.name, 'Automated push day (Copy)');
    assert.equal((duplicatedRoutine.exercises as unknown[]).length, 2);

    const list = await request('/routines', { headers: { authorization: `Bearer ${accessToken}` } });
    assert.equal(list.status, 200);
    assert.equal((list.body.data as unknown[]).length, 2);

    const deletion = await request(`/routines/${routineId}`, { headers: { authorization: `Bearer ${accessToken}` }, method: 'DELETE' });
    assert.equal(deletion.status, 204);
    const deletedRoutine = await request(`/routines/${routineId}`, { headers: { authorization: `Bearer ${accessToken}` } });
    assert.equal(deletedRoutine.status, 404);
  });

  it('saves a routine atomically (create, update, and rollback)', async () => {
    const accessToken = await registerAndGetAccessToken();
    const headers = { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' };
    const firstExerciseId = await createExercise(accessToken);
    const secondExerciseId = await createExercise(accessToken);

    const created = await request('/routines/save', {
      body: JSON.stringify({
        name: 'Atomic routine',
        exercises: [
          {
            exerciseId: firstExerciseId, targetSets: 3, targetRepetitionsMin: 8, targetRepetitionsMax: 12,
            targetWeight: 20, restSeconds: 90, notes: 'Tight grip',
          },
          { exerciseId: secondExerciseId },
        ],
      }),
      headers,
      method: 'POST',
    });
    assert.equal(created.status, 200);
    const routine = created.body.routine as Record<string, unknown>;
    const routineId = routine.id as string;
    assert.equal(routine.name, 'Atomic routine');
    const exercises = routine.exercises as Array<Record<string, unknown>>;
    assert.equal(exercises.length, 2);
    assert.deepEqual(exercises.map((item) => item.position), [1, 2]);
    assert.equal(exercises[0].targetSets, 3);
    assert.equal(exercises[0].notes, 'Tight grip');

    const updated = await request('/routines/save', {
      body: JSON.stringify({
        id: routineId,
        name: 'Atomic routine v2',
        exercises: [
          { exerciseId: secondExerciseId, targetSets: 4, targetRepetitionsMin: 5, targetRepetitionsMax: 5 },
        ],
      }),
      headers,
      method: 'POST',
    });
    assert.equal(updated.status, 200);
    const updatedExercises = (updated.body.routine as Record<string, unknown>).exercises as Array<Record<string, unknown>>;
    assert.equal(updatedExercises.length, 1);
    assert.equal((updatedExercises[0].exercise as Record<string, unknown>).id, secondExerciseId);
    assert.equal(updatedExercises[0].position, 1);
    assert.equal(updatedExercises[0].targetSets, 4);

    const failed = await request('/routines/save', {
      body: JSON.stringify({
        id: routineId,
        name: 'Atomic routine v3',
        exercises: [
          { exerciseId: secondExerciseId },
          { exerciseId: randomUUID() },
        ],
      }),
      headers,
      method: 'POST',
    });
    assert.equal(failed.status, 404);
    assert.equal((failed.body.error as Record<string, string>).code, 'EXERCISE_NOT_FOUND');

    const afterFailed = await request(`/routines/${routineId}`, { headers: { authorization: `Bearer ${accessToken}` } });
    assert.equal((afterFailed.body.routine as Record<string, unknown>).name, 'Atomic routine v2');
    assert.equal(((afterFailed.body.routine as Record<string, unknown>).exercises as unknown[]).length, 1);
  });

  it('does not expose a routine to another user', async () => {
    const ownerToken = await registerAndGetAccessToken();
    const otherUserToken = await registerAndGetAccessToken();
    const creation = await request('/routines', {
      body: JSON.stringify({ name: 'Private routine' }),
      headers: { authorization: `Bearer ${ownerToken}`, 'content-type': 'application/json' },
      method: 'POST',
    });
    const routineId = (creation.body.routine as Record<string, string>).id;

    const inaccessible = await request(`/routines/${routineId}`, {
      headers: { authorization: `Bearer ${otherUserToken}` },
    });
    assert.equal(inaccessible.status, 404);
    assert.equal((inaccessible.body.error as Record<string, string>).code, 'ROUTINE_NOT_FOUND');
  });
});
