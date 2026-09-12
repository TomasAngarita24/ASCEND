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
  let body: Record<string, unknown> = {};
  if (response.status !== 204) {
    body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  }

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
  it('does not expose progress data for a deleted custom exercise', async () => {
  const accessToken = await registerAndGetAccessToken();
  const headers = {
    authorization: `Bearer ${accessToken}`,
    'content-type': 'application/json',
  };

  const creation = await request('/exercises', {
    body: JSON.stringify({
      name: `Deleted progress exercise ${randomUUID()}`,
      targetMuscleGroups: ['Chest'],
    }),
    headers,
    method: 'POST',
  });

  assert.equal(creation.status, 201);

  const exerciseId = (creation.body.exercise as Record<string, string>).id;

  const deleted = await request(`/exercises/${exerciseId}`, {
    headers,
    method: 'DELETE',
  });

  assert.equal(deleted.status, 204);

  const estimatedOneRepMax = await request(
    `/progress/exercises/${exerciseId}/estimated-one-rep-max`,
    {
      headers: { authorization: `Bearer ${accessToken}` },
    },
  );

  assert.equal(estimatedOneRepMax.status, 404);
  assert.equal(
    (estimatedOneRepMax.body.error as Record<string, string>).code,
    'EXERCISE_NOT_FOUND',
  );

  const progression = await request(`/progress/exercises/${exerciseId}`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });

  assert.equal(progression.status, 404);
  assert.equal(
    (progression.body.error as Record<string, string>).code,
    'EXERCISE_NOT_FOUND',
  );

  const chart = await request(
    `/progress/charts?metric=volume&exerciseId=${exerciseId}`,
    {
      headers: { authorization: `Bearer ${accessToken}` },
    },
  );

  assert.equal(chart.status, 404);
  assert.equal(
    (chart.body.error as Record<string, string>).code,
    'EXERCISE_NOT_FOUND',
  );
});
  it('updates and deletes a custom exercise for its owner', async () => {
    const ownerToken = await registerAndGetAccessToken();
    const headers = {
      authorization: `Bearer ${ownerToken}`,
      'content-type': 'application/json',
    };

    const creation = await request('/exercises', {
      body: JSON.stringify({
        name: `Original Exercise ${randomUUID()}`,
        equipment: 'Mancuernas',
        targetMuscleGroups: ['Biceps'],
      }),
      headers,
      method: 'POST',
    });

    assert.equal(creation.status, 201);
    const exerciseId = (creation.body.exercise as Record<string, string>).id;

    const update = await request(`/exercises/${exerciseId}`, {
      body: JSON.stringify({
        name: 'Updated Exercise Name',
        equipment: 'Barra',
        targetMuscleGroups: ['Triceps'],
      }),
      headers,
      method: 'PUT',
    });

    assert.equal(update.status, 200);
    const updated = update.body.exercise as Record<string, unknown>;
    assert.equal(updated.name, 'Updated Exercise Name');
    assert.equal(updated.equipment, 'Barra');

    const del = await request(`/exercises/${exerciseId}`, {
      headers,
      method: 'DELETE',
    });

    assert.equal(del.status, 204);

    const verifyGet = await request(`/exercises/${exerciseId}`, {
      headers,
    });
    assert.equal(verifyGet.status, 404);
    const deletedExercise = await prisma.exercise.findUnique({
      where: { id: exerciseId },
      select: { id: true, deletedAt: true },
    });

    assert.ok(deletedExercise);
    assert.ok(deletedExercise.deletedAt);
  });

  it('does not allow a deleted custom exercise to be added to a workout', async () => {
    const accessToken = await registerAndGetAccessToken();
    const headers = {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    };

    // Create exercise
    const creation = await request('/exercises', {
      body: JSON.stringify({
        name: `Deleted workout exercise ${randomUUID()}`,
        targetMuscleGroups: ['Chest'],
      }),
      headers,
      method: 'POST',
    });

    assert.equal(creation.status, 201);
    const exerciseId = (creation.body.exercise as Record<string, string>).id;

    // Delete exercise
    const deleted = await request(`/exercises/${exerciseId}`, {
      headers,
      method: 'DELETE',
    });

    assert.equal(deleted.status, 204);

    // Create workout
    const workout = await request('/workouts', {
      body: '{}',
      headers,
      method: 'POST',
    });

    assert.equal(workout.status, 201);
    const workoutId = (workout.body.workout as Record<string, string>).id;

    // Try to add deleted exercise
    const addedExercise = await request(`/workouts/${workoutId}/exercises`, {
      body: JSON.stringify({ exerciseId }),
      headers,
      method: 'POST',
    });

    assert.equal(addedExercise.status, 404);
    assert.equal(
      (addedExercise.body.error as Record<string, string>).code,
      'EXERCISE_NOT_FOUND',
    );
  });

  it('keeps previous performance available after deleting a custom exercise', async () => {
    const accessToken = await registerAndGetAccessToken();
    const headers = {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    };

    const creation = await request('/exercises', {
      body: JSON.stringify({
        name: `Historical Exercise ${randomUUID()}`,
        targetMuscleGroups: ['Chest'],
      }),
      headers,
      method: 'POST',
    });

    assert.equal(creation.status, 201);
    const exerciseId = (creation.body.exercise as Record<string, string>).id;

    const started = await request('/workouts', {
      body: '{}',
      headers,
      method: 'POST',
    });

    assert.equal(started.status, 201);
    const workoutId = (started.body.workout as Record<string, string>).id;

    const addedExercise = await request(`/workouts/${workoutId}/exercises`, {
      body: JSON.stringify({ exerciseId }),
      headers,
      method: 'POST',
    });

    assert.equal(addedExercise.status, 201);
    const workoutExerciseId = (
      addedExercise.body.workoutExercise as Record<string, string>
    ).id;

    const createdSet = await request(
      `/workouts/${workoutId}/exercises/${workoutExerciseId}/sets`,
      {
        body: JSON.stringify({
          weight: 60,
          repetitions: 10,
          isCompleted: true,
        }),
        headers,
        method: 'POST',
      },
    );

    assert.equal(createdSet.status, 201);

    const completed = await request(`/workouts/${workoutId}/complete`, {
      headers,
      method: 'POST',
    });

    assert.equal(completed.status, 200);

    const deleted = await request(`/exercises/${exerciseId}`, {
      headers,
      method: 'DELETE',
    });

    assert.equal(deleted.status, 204);

    const verifyGet = await request(`/exercises/${exerciseId}`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });

    assert.equal(verifyGet.status, 404);

    const previousPerformance = await request(
      `/exercises/${exerciseId}/previous-performance`,
      {
        headers: { authorization: `Bearer ${accessToken}` },
      },
    );

    assert.equal(previousPerformance.status, 200);
    const previousWorkout =
      previousPerformance.body.previousWorkout as Record<string, unknown>;

    assert.equal(previousWorkout.id, workoutId);
    assert.deepEqual(previousWorkout.sets, [
      {
        setNumber: 1,
        weight: 60,
        repetitions: 10,
        rpe: null,
        setType: 'normal',
      },
    ]);
  });

  it('marks and un-marks an exercise as favorite, scoped per user', async () => {
    const ownerToken = await registerAndGetAccessToken();
    const otherUserToken = await registerAndGetAccessToken();
    const ownerHeaders = {
      authorization: `Bearer ${ownerToken}`,
      'content-type': 'application/json',
    };

    const creation = await request('/exercises', {
      body: JSON.stringify({ name: `Favorite exercise ${randomUUID()}`, targetMuscleGroups: ['Chest'] }),
      headers: ownerHeaders,
      method: 'POST',
    });

    assert.equal(creation.status, 201);
    const exerciseId = (creation.body.exercise as Record<string, string>).id;

    // Starts empty and is isolated from other users
    const emptyList = await request('/exercises/favorites', {
      headers: ownerHeaders,
    });
    assert.equal(emptyList.status, 200);
    assert.deepEqual(emptyList.body.exerciseIds, []);

    const emptyOther = await request('/exercises/favorites', {
      headers: { authorization: `Bearer ${otherUserToken}` },
    });
    assert.deepEqual(emptyOther.body.exerciseIds, []);

    // Favorite it (idempotent upsert)
    const added = await request(`/exercises/favorites/${exerciseId}`, {
      headers: ownerHeaders,
      method: 'PUT',
    });
    assert.equal(added.status, 204);

    const addedAgain = await request(`/exercises/favorites/${exerciseId}`, {
      headers: ownerHeaders,
      method: 'PUT',
    });
    assert.equal(addedAgain.status, 204);

    const list = await request('/exercises/favorites', {
      headers: ownerHeaders,
    });
    assert.deepEqual(list.body.exerciseIds, [exerciseId]);

    // Still isolated per user
    const otherList = await request('/exercises/favorites', {
      headers: { authorization: `Bearer ${otherUserToken}` },
    });
    assert.deepEqual(otherList.body.exerciseIds, []);

    // Remove it (idempotent delete)
    const removed = await request(`/exercises/favorites/${exerciseId}`, {
      headers: ownerHeaders,
      method: 'DELETE',
    });
    assert.equal(removed.status, 204);

    const removedAgain = await request(`/exercises/favorites/${exerciseId}`, {
      headers: ownerHeaders,
      method: 'DELETE',
    });
    assert.equal(removedAgain.status, 204);

    const afterRemoval = await request('/exercises/favorites', {
      headers: ownerHeaders,
    });
    assert.deepEqual(afterRemoval.body.exerciseIds, []);
  });

  it('rejects favoriting an inaccessible exercise', async () => {
    const ownerToken = await registerAndGetAccessToken();
    const otherUserToken = await registerAndGetAccessToken();

    const creation = await request('/exercises', {
      body: JSON.stringify({ name: `Private favorite target ${randomUUID()}` }),
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'content-type': 'application/json',
      },
      method: 'POST',
    });

    assert.equal(creation.status, 201);
    const exerciseId = (creation.body.exercise as Record<string, string>).id;

    const forbidden = await request(`/exercises/favorites/${exerciseId}`, {
      headers: { authorization: `Bearer ${otherUserToken}` },
      method: 'PUT',
    });

    assert.equal(forbidden.status, 404);
    assert.equal(
      (forbidden.body.error as Record<string, string>).code,
      'EXERCISE_NOT_FOUND',
    );
  });
});
