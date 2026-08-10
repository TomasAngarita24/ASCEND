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
  const email = `workout.automated.${randomUUID()}@ascend.test`;
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
    body: JSON.stringify({ name: `Workout exercise ${randomUUID()}` }),
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

describe('workouts', () => {
  it('starts from a routine, records a set, and transitions its state', async () => {
    const accessToken = await registerAndGetAccessToken();
    const headers = { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' };
    const firstExerciseId = await createExercise(accessToken);
    const secondExerciseId = await createExercise(accessToken);
    const routine = await request('/routines', {
      body: JSON.stringify({ name: 'Workout source routine' }), headers, method: 'POST',
    });
    const routineId = (routine.body.routine as Record<string, string>).id;
    const routineExercise = await request(`/routines/${routineId}/exercises`, {
      body: JSON.stringify({ exerciseId: firstExerciseId }), headers, method: 'POST',
    });
    assert.equal(routineExercise.status, 201);

    const started = await request('/workouts', {
      body: JSON.stringify({ routineId }), headers, method: 'POST',
    });
    assert.equal(started.status, 201);
    const workout = started.body.workout as Record<string, unknown>;
    const workoutId = workout.id as string;
    const copiedExercises = workout.exercises as Array<Record<string, unknown>>;
    assert.equal(copiedExercises.length, 1);
    const workoutExerciseId = copiedExercises[0].id as string;

    const createdSet = await request(`/workouts/${workoutId}/exercises/${workoutExerciseId}/sets`, {
      body: JSON.stringify({ weight: 60, repetitions: 10, rpe: 8, isCompleted: true }), headers, method: 'POST',
    });
    assert.equal(createdSet.status, 201);
    const set = createdSet.body.set as Record<string, unknown>;
    assert.equal(set.isCompleted, true);
    assert.ok(set.completedAt);

    const updatedSet = await request(`/workouts/${workoutId}/exercises/${workoutExerciseId}/sets/${set.id as string}`, {
      body: JSON.stringify({ isCompleted: false }), headers, method: 'PATCH',
    });
    assert.equal(updatedSet.status, 200);
    assert.equal((updatedSet.body.set as Record<string, unknown>).completedAt, null);

    const addedExercise = await request(`/workouts/${workoutId}/exercises`, {
      body: JSON.stringify({ exerciseId: secondExerciseId }), headers, method: 'POST',
    });
    assert.equal(addedExercise.status, 201);
    const addedWorkoutExerciseId = (addedExercise.body.workoutExercise as Record<string, string>).id;

    const pause = await request(`/workouts/${workoutId}/pause`, { headers, method: 'POST' });
    assert.equal(pause.status, 200);
    assert.equal((pause.body.workout as Record<string, string>).status, 'paused');
    const forbiddenAddition = await request(`/workouts/${workoutId}/exercises`, {
      body: JSON.stringify({ exerciseId: secondExerciseId }), headers, method: 'POST',
    });
    assert.equal(forbiddenAddition.status, 409);

    const resume = await request(`/workouts/${workoutId}/resume`, { headers, method: 'POST' });
    assert.equal(resume.status, 200);
    const removal = await request(`/workouts/${workoutId}/exercises/${addedWorkoutExerciseId}`, {
      headers: { authorization: `Bearer ${accessToken}` }, method: 'DELETE',
    });
    assert.equal(removal.status, 204);

    const complete = await request(`/workouts/${workoutId}/complete`, { headers, method: 'POST' });
    assert.equal(complete.status, 200);
    assert.equal((complete.body.workout as Record<string, string>).status, 'completed');
    assert.ok((complete.body.workout as Record<string, string>).completedAt);

    const completedWorkout = await request(`/workouts/${workoutId}`, { headers: { authorization: `Bearer ${accessToken}` } });
    assert.equal(completedWorkout.status, 200);
    assert.equal(((completedWorkout.body.workout as Record<string, unknown>).exercises as unknown[]).length, 1);
  });

  it('does not expose a workout to another user', async () => {
    const ownerToken = await registerAndGetAccessToken();
    const otherUserToken = await registerAndGetAccessToken();
    const creation = await request('/workouts', {
      body: '{}', headers: { authorization: `Bearer ${ownerToken}`, 'content-type': 'application/json' }, method: 'POST',
    });
    assert.equal(creation.status, 201);
    const workoutId = (creation.body.workout as Record<string, string>).id;
    const inaccessible = await request(`/workouts/${workoutId}`, {
      headers: { authorization: `Bearer ${otherUserToken}` },
    });
    assert.equal(inaccessible.status, 404);
    assert.equal((inaccessible.body.error as Record<string, string>).code, 'WORKOUT_NOT_FOUND');
  });
});
