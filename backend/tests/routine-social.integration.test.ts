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
  const email = `routine-social.automated.${randomUUID()}@ascend.test`;
  testEmails.add(email);
  const response = await request('/auth/register', {
    body: JSON.stringify({ email, password: 'A secure automated routine social test 2026' }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });
  assert.equal(response.status, 201);
  return response.body.accessToken as string;
}

async function routineWithExercise(accessToken: string): Promise<string> {
  const headers = { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' };
  const exercise = await request('/exercises', {
    body: JSON.stringify({ name: `Routine social exercise ${randomUUID()}`, targetMuscleGroups: ['Back'] }),
    headers,
    method: 'POST',
  });
  const exerciseId = (exercise.body.exercise as Record<string, string>).id;

  const created = await request('/routines', {
    body: JSON.stringify({ name: 'Espalda fuerte' }),
    headers,
    method: 'POST',
  });
  const routineId = (created.body.routine as Record<string, string>).id;

  const added = await request(`/routines/${routineId}/exercises`, {
    body: JSON.stringify({
      exerciseId,
      targetSets: 4,
      targetRepetitionsMin: 8,
      targetRepetitionsMax: 10,
    }),
    headers,
    method: 'POST',
  });
  assert.equal(added.status, 201);

  return routineId;
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

describe('shared routines', () => {
  it('shares a routine and shows it in the feed with its muscle groups', async () => {
    const accessToken = await registerAndGetAccessToken();
    const routineId = await routineWithExercise(accessToken);
    const headers = { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' };

    const shared = await request(`/routines/${routineId}/share`, {
      body: JSON.stringify({ caption: 'Rutina de espalda para todos' }),
      headers,
      method: 'POST',
    });
    assert.equal(shared.status, 201);
    const post = shared.body.post as Record<string, unknown>;
    assert.equal(post.postType, 'routine');

    const feed = await request('/social/feed', {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    const feedPost = (feed.body.data as Array<Record<string, unknown>>).find((p) => p.id === post.id);
    assert.ok(feedPost, 'routine post should appear in the feed');
    const routine = feedPost.routine as Record<string, unknown>;
    assert.equal(routine.id, routineId);
    assert.equal(routine.name, 'Espalda fuerte');
    assert.equal(routine.exerciseCount, 1);
    assert.deepEqual(routine.muscleGroups, ['Back']);
  });

  it('lets another user copy a shared routine into their own library', async () => {
    const owner = await registerAndGetAccessToken();
    const copier = await registerAndGetAccessToken();
    const routineId = await routineWithExercise(owner);
    const ownerHeaders = { authorization: `Bearer ${owner}`, 'content-type': 'application/json' };

    const shared = await request(`/routines/${routineId}/share`, { body: '{}', headers: ownerHeaders, method: 'POST' });
    const postId = (shared.body.post as Record<string, string>).id;

    const copied = await request(`/social/posts/${postId}/copy-routine`, {
      headers: { authorization: `Bearer ${copier}` },
      method: 'POST',
    });
    assert.equal(copied.status, 201);
    const copiedRoutine = copied.body.routine as Record<string, unknown>;
    assert.equal((copiedRoutine.name as string).endsWith('(Copy)'), true);

    const routines = await request('/routines', {
      headers: { authorization: `Bearer ${copier}` },
    });
    const routineIds = (routines.body.data as Array<{ id: string }>).map((routine) => routine.id);
    assert.equal(routineIds.includes(copiedRoutine.id as string), true);

    const detail = await request(`/routines/${copiedRoutine.id as string}`, {
      headers: { authorization: `Bearer ${copier}` },
    });
    const exercises = (detail.body.routine as { exercises: unknown[] }).exercises;
    assert.equal(exercises.length, 1);
  });

  it('rejects sharing foreign routines, copying workout posts, and copying unknown posts', async () => {
    const owner = await registerAndGetAccessToken();
    const other = await registerAndGetAccessToken();
    const routineId = await routineWithExercise(owner);
    const otherHeaders = { authorization: `Bearer ${other}`, 'content-type': 'application/json' };

    const foreignShare = await request(`/routines/${routineId}/share`, { body: '{}', headers: otherHeaders, method: 'POST' });
    assert.equal(foreignShare.status, 404);
    assert.equal((foreignShare.body.error as Record<string, string>).code, 'ROUTINE_NOT_FOUND');

    const exercise = await request('/exercises', {
      body: JSON.stringify({ name: `Workout share ${randomUUID()}`, targetMuscleGroups: ['Chest'] }),
      headers: otherHeaders,
      method: 'POST',
    });
    const exerciseId = (exercise.body.exercise as Record<string, string>).id;
    const started = await request('/workouts', { body: '{}', headers: otherHeaders, method: 'POST' });
    const workoutId = (started.body.workout as Record<string, string>).id;
    const addedEx = await request(`/workouts/${workoutId}/exercises`, {
      body: JSON.stringify({ exerciseId }), headers: otherHeaders, method: 'POST',
    });
    const weId = (addedEx.body.workoutExercise as Record<string, string>).id;
    await request(`/workouts/${workoutId}/exercises/${weId}/sets`, {
      body: JSON.stringify({ weight: 50, repetitions: 8, isCompleted: true }), headers: otherHeaders, method: 'POST',
    });
    await request(`/workouts/${workoutId}/complete`, { headers: otherHeaders, method: 'POST' });
    const shared = await request(`/workouts/${workoutId}/share`, { body: '{}', headers: otherHeaders, method: 'POST' });
    const workoutPostId = (shared.body.post as Record<string, string>).id;

    const copyWorkout = await request(`/social/posts/${workoutPostId}/copy-routine`, {
      headers: { authorization: `Bearer ${other}` }, method: 'POST',
    });
    assert.equal(copyWorkout.status, 422);
    assert.equal((copyWorkout.body.error as Record<string, string>).code, 'NOT_A_ROUTINE_POST');

    const unknownId = '00000000-0000-0000-0000-000000000000';
    const copyUnknown = await request(`/social/posts/${unknownId}/copy-routine`, {
      headers: { authorization: `Bearer ${other}` }, method: 'POST',
    });
    assert.equal(copyUnknown.status, 404);
  });
});