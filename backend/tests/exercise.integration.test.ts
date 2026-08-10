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

function newCredentials(): { email: string; password: string } {
  const email = `exercise.automated.${randomUUID()}@ascend.test`;
  testEmails.add(email);

  return { email, password: 'A secure automated test password 2026' };
}

async function request(path: string, options: RequestInit = {}): Promise<ApiResponse> {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = await response.json() as Record<string, unknown>;

  return { body, status: response.status };
}

async function registerAndGetAccessToken(): Promise<string> {
  const response = await request('/auth/register', {
    body: JSON.stringify(newCredentials()),
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

describe('exercises', () => {
  it('creates, lists, and retrieves a custom exercise for its owner', async () => {
    const accessToken = await registerAndGetAccessToken();
    const headers = {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    };
    const exerciseName = `Automated exercise ${randomUUID()}`;

    const creation = await request('/exercises', {
      body: JSON.stringify({
        description: 'Exercise created by the integration test.',
        equipment: 'Dumbbells',
        instructions: 'Perform each repetition with control.',
        name: exerciseName,
        targetMuscleGroups: ['Chest', 'Triceps'],
      }),
      headers,
      method: 'POST',
    });

    assert.equal(creation.status, 201);
    const createdExercise = creation.body.exercise as Record<string, unknown>;
    const exerciseId = createdExercise.id as string;
    assert.ok(exerciseId);
    assert.equal(createdExercise.name, exerciseName);
    assert.equal(createdExercise.isCustom, true);

    const list = await request(
      `/exercises?query=${encodeURIComponent(exerciseName)}&muscleGroup=Chest&equipment=Dumbbells`,
      { headers: { authorization: `Bearer ${accessToken}` } },
    );

    assert.equal(list.status, 200);
    const listedExercises = list.body.data as Array<Record<string, unknown>>;
    assert.equal(listedExercises.length, 1);
    assert.equal(listedExercises[0].id, exerciseId);

    const detail = await request(`/exercises/${exerciseId}`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });

    assert.equal(detail.status, 200);
    assert.deepEqual(detail.body.exercise, createdExercise);
  });

  it('does not expose a custom exercise to another user', async () => {
    const ownerToken = await registerAndGetAccessToken();
    const otherUserToken = await registerAndGetAccessToken();
    const creation = await request('/exercises', {
      body: JSON.stringify({ name: `Private exercise ${randomUUID()}` }),
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'content-type': 'application/json',
      },
      method: 'POST',
    });

    assert.equal(creation.status, 201);
    const exerciseId = (creation.body.exercise as Record<string, string>).id;

    const inaccessibleExercise = await request(`/exercises/${exerciseId}`, {
      headers: { authorization: `Bearer ${otherUserToken}` },
    });

    assert.equal(inaccessibleExercise.status, 404);
    assert.equal(
      (inaccessibleExercise.body.error as Record<string, string>).code,
      'EXERCISE_NOT_FOUND',
    );
  });
});
