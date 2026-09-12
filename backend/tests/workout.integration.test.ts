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

async function createExercise(accessToken: string, targetMuscleGroups: string[] = []): Promise<string> {
  const response = await request('/exercises', {
    body: JSON.stringify({ name: `Workout exercise ${randomUUID()}`, targetMuscleGroups }),
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
  it('pre-fills workout sets from the routine target configuration', async () => {
    const accessToken = await registerAndGetAccessToken();
    const headers = { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' };
    const exerciseId = await createExercise(accessToken);
    const routine = await request('/routines/save', {
      body: JSON.stringify({
        name: 'Target routine',
        exercises: [
          {
            exerciseId,
            targetSets: 4,
            targetWeight: 60,
            targetRepetitionsMin: 8,
            targetRepetitionsMax: 12,
            restSeconds: 90,
          },
        ],
      }),
      headers,
      method: 'POST',
    });
    assert.equal(routine.status, 200);
    const routineId = (routine.body.routine as Record<string, string>).id;

    const started = await request('/workouts', {
      body: JSON.stringify({ routineId }), headers, method: 'POST',
    });
    assert.equal(started.status, 201);
    const workout = started.body.workout as Record<string, unknown>;
    const exercises = workout.exercises as Array<Record<string, unknown>>;
    assert.equal(exercises.length, 1);
    const sets = exercises[0].sets as Array<Record<string, unknown>>;
    assert.equal(sets.length, 4);
    assert.deepEqual(sets.map((set) => set.setNumber), [1, 2, 3, 4]);
    assert.equal(sets[0].weight, 60);
    assert.deepEqual(sets.map((set) => set.repetitions), [12, 11, 10, 9]);
    assert.equal((exercises[0] as Record<string, unknown>).restSeconds, 90);
    assert.equal(sets.every((set) => (set as Record<string, unknown>).setType === 'normal'), true);
  });
  it('pre-fills a single default set when the routine has no target sets', async () => {
    const accessToken = await registerAndGetAccessToken();
    const headers = { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' };
    const exerciseId = await createExercise(accessToken);
    const routine = await request('/routines', {
      body: JSON.stringify({ name: 'No targets routine' }), headers, method: 'POST',
    });
    const routineId = (routine.body.routine as Record<string, string>).id;
    await request(`/routines/${routineId}/exercises`, {
      body: JSON.stringify({ exerciseId }), headers, method: 'POST',
    });

    const started = await request('/workouts', {
      body: JSON.stringify({ routineId }), headers, method: 'POST',
    });
    const workout = started.body.workout as Record<string, unknown>;
    const exercises = workout.exercises as Array<Record<string, unknown>>;
    const sets = exercises[0].sets as Array<Record<string, unknown>>;
    assert.equal(sets.length, 1);
    assert.equal(sets[0].weight, null);
    assert.equal(sets[0].repetitions, null);
  });
it('normalizes legacy "drop" set type to "drop_set"', async () => {
    const accessToken = await registerAndGetAccessToken();
    const headers = { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' };
    const exerciseId = await createExercise(accessToken);
    const started = await request('/workouts', { body: '{}', headers, method: 'POST' });
    const workoutId = (started.body.workout as Record<string, string>).id;
    const addedEx = await request(`/workouts/${workoutId}/exercises`, {
      body: JSON.stringify({ exerciseId }), headers, method: 'POST',
    });
    const workoutExerciseId = (addedEx.body.workoutExercise as Record<string, string>).id;
    const created = await request(`/workouts/${workoutId}/exercises/${workoutExerciseId}/sets`, {
      body: JSON.stringify({ setType: 'drop', weight: 40, repetitions: 6, isCompleted: true }), headers, method: 'POST',
    });
    assert.equal(created.status, 201);
    assert.equal((created.body.set as Record<string, string>).setType, 'drop_set');
  });
  it('keeps a workout after deleting its source routine', async () => {
  const accessToken = await registerAndGetAccessToken();
  const headers = {
    authorization: `Bearer ${accessToken}`,
    'content-type': 'application/json',
  };

  const exerciseId = await createExercise(accessToken);

  const routine = await request('/routines', {
    body: JSON.stringify({ name: 'Routine to delete' }),
    headers,
    method: 'POST',
  });

  assert.equal(routine.status, 201);

  const routineId = (routine.body.routine as Record<string, string>).id;

  const routineExercise = await request(`/routines/${routineId}/exercises`, {
    body: JSON.stringify({ exerciseId }),
    headers,
    method: 'POST',
  });

  assert.equal(routineExercise.status, 201);

  const started = await request('/workouts', {
    body: JSON.stringify({ routineId }),
    headers,
    method: 'POST',
  });

  assert.equal(started.status, 201);

  const workoutId = (started.body.workout as Record<string, string>).id;

  const deleted = await request(`/routines/${routineId}`, {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
    method: 'DELETE',
  });

  assert.equal(deleted.status, 204);

  const workout = await request(`/workouts/${workoutId}`, {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });

  assert.equal(workout.status, 200);

  const workoutData = workout.body.workout as Record<string, unknown>;

  assert.equal(workoutData.id, workoutId);
  assert.equal(workoutData.routineId, null);
});
  it('returns paginated history with completed-workout metrics', async () => {
    const accessToken = await registerAndGetAccessToken();
    const headers = { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' };
    const exerciseId = await createExercise(accessToken, ['Chest']);
    const started = await request('/workouts', { body: '{}', headers, method: 'POST' });
    const workoutId = (started.body.workout as Record<string, string>).id;
    const exercise = await request(`/workouts/${workoutId}/exercises`, {
      body: JSON.stringify({ exerciseId }), headers, method: 'POST',
    });
    const workoutExerciseId = (exercise.body.workoutExercise as Record<string, string>).id;
    const set = await request(`/workouts/${workoutId}/exercises/${workoutExerciseId}/sets`, {
      body: JSON.stringify({ weight: 60, repetitions: 10, isCompleted: true }), headers, method: 'POST',
    });
    assert.equal(set.status, 201);
    const completed = await request(`/workouts/${workoutId}/complete`, { headers, method: 'POST' });
    assert.equal(completed.status, 200);

    const previousPerformance = await request(`/exercises/${exerciseId}/previous-performance`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    assert.equal(previousPerformance.status, 200);
    const previousWorkout = previousPerformance.body.previousWorkout as Record<string, unknown>;
    assert.equal(previousWorkout.id, workoutId);
    assert.deepEqual(previousWorkout.sets, [{
      setNumber: 1,
      weight: 60,
      repetitions: 10,
      rpe: null,
      setType: 'normal',
    }]);

    const estimatedOneRepMax = await request(`/progress/exercises/${exerciseId}/estimated-one-rep-max`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    assert.equal(estimatedOneRepMax.status, 200);
    assert.equal(estimatedOneRepMax.body.estimatedOneRepMax, 80);

    const progression = await request(`/progress/exercises/${exerciseId}`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    assert.equal(progression.status, 200);
    const progressionData = progression.body.data as Array<Record<string, unknown>>;
    assert.equal(progressionData.length, 1);
    assert.equal(progressionData[0].weight, 60);
    assert.equal(progressionData[0].repetitions, 10);
    assert.equal(progressionData[0].volume, 600);
    assert.equal(progressionData[0].estimatedOneRepMax, 80);

    const volumeChart = await request(`/progress/charts?metric=volume&exerciseId=${exerciseId}`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    assert.equal(volumeChart.status, 200);
    assert.equal((volumeChart.body.data as Array<Record<string, number>>)[0].value, 600);

    const frequencyChart = await request('/progress/charts?metric=workout_frequency', {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    assert.equal(frequencyChart.status, 200);
    assert.equal((frequencyChart.body.data as Array<Record<string, number>>)[0].value, 1);

    const muscleGroups = await request('/progress/muscle-groups', {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    assert.equal(muscleGroups.status, 200);
    assert.deepEqual(muscleGroups.body.data, [{
      muscleGroup: 'Chest',
      trainingFrequency: 1,
      volume: 600,
    }]);

    const personalRecords = await request('/progress/personal-records', {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    assert.equal(personalRecords.status, 200);
    const records = personalRecords.body.data as Array<Record<string, unknown>>;
    assert.equal(records.length, 4);
    assert.deepEqual(new Set(records.map((record) => record.type)), new Set([
      'highest_weight',
      'highest_repetitions_at_weight',
      'estimated_one_rep_max',
      'highest_training_volume',
    ]));

    const history = await request('/workouts?page=1&limit=20', {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    assert.equal(history.status, 200);
    const entries = history.body.data as Array<Record<string, unknown>>;
    assert.equal(entries.length, 1);
    assert.equal(entries[0].id, workoutId);
    assert.equal(entries[0].exerciseCount, 1);
    assert.equal(entries[0].setsCompleted, 1);
    assert.equal(entries[0].totalRepetitions, 10);
    assert.equal(entries[0].totalVolume, 600);
    assert.equal((history.body.pagination as Record<string, number>).total, 1);

    const statistics = await request('/progress/statistics', {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    assert.equal(statistics.status, 200);
    assert.deepEqual(statistics.body.statistics, {
      totalWorkouts: 1,
      workoutFrequency: 1,
      totalVolume: 600,
      totalSets: 1,
      totalRepetitions: 10,
      personalRecords: 4,
    });

    const cancelled = await request('/workouts', { body: '{}', headers, method: 'POST' });
    const cancelledWorkoutId = (cancelled.body.workout as Record<string, string>).id;
    const cancellation = await request(`/workouts/${cancelledWorkoutId}/cancel`, { headers, method: 'POST' });
    assert.equal(cancellation.status, 200);
    const cancelledHistory = await request('/workouts?status=cancelled', {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    assert.equal(cancelledHistory.status, 200);
    assert.equal((cancelledHistory.body.data as Array<Record<string, string>>)[0].id, cancelledWorkoutId);
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

  it('allows editing sets on a completed workout and deleting the workout', async () => {
    const accessToken = await registerAndGetAccessToken();
    const headers = { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' };
    const exerciseId = await createExercise(accessToken);

    const started = await request('/workouts', { body: '{}', headers, method: 'POST' });
    const workoutId = (started.body.workout as Record<string, string>).id;

    const addedEx = await request(`/workouts/${workoutId}/exercises`, {
      body: JSON.stringify({ exerciseId }), headers, method: 'POST',
    });
    const workoutExerciseId = (addedEx.body.workoutExercise as Record<string, string>).id;

    const setRes = await request(`/workouts/${workoutId}/exercises/${workoutExerciseId}/sets`, {
      body: JSON.stringify({ weight: 80, repetitions: 8, isCompleted: true }), headers, method: 'POST',
    });
    const setId = (setRes.body.set as Record<string, string>).id;

    // Complete the workout
    const completed = await request(`/workouts/${workoutId}/complete`, { headers, method: 'POST' });
    assert.equal(completed.status, 200);

    // Edit set on completed workout
    const editRes = await request(`/workouts/${workoutId}/exercises/${workoutExerciseId}/sets/${setId}`, {
      body: JSON.stringify({ weight: 85, repetitions: 10, notes: 'Felt very strong' }), headers, method: 'PATCH',
    });
    assert.equal(editRes.status, 200);
    const editedSet = editRes.body.set as Record<string, unknown>;
    assert.equal(editedSet.weight, 85);
    assert.equal(editedSet.repetitions, 10);
    assert.equal(editedSet.notes, 'Felt very strong');

    // Clear a set field with null on a completed workout
    const clearRes = await request(`/workouts/${workoutId}/exercises/${workoutExerciseId}/sets/${setId}`, {
      body: JSON.stringify({ weight: null, repetitions: null }), headers, method: 'PATCH',
    });
    assert.equal(clearRes.status, 200);
    const clearedSet = clearRes.body.set as Record<string, unknown>;
    assert.equal(clearedSet.weight, null);
    assert.equal(clearedSet.repetitions, null);

    // Restore the values for the remaining assertions
    const restoreRes = await request(`/workouts/${workoutId}/exercises/${workoutExerciseId}/sets/${setId}`, {
      body: JSON.stringify({ weight: 85, repetitions: 10 }), headers, method: 'PATCH',
    });
    assert.equal(restoreRes.status, 200);

    // Delete the workout
    const deleteRes = await request(`/workouts/${workoutId}`, { headers, method: 'DELETE' });
    assert.equal(deleteRes.status, 204);

    // Verify it is gone
    const fetchAfterDelete = await request(`/workouts/${workoutId}`, { headers });
    assert.equal(fetchAfterDelete.status, 404);
  });
});
