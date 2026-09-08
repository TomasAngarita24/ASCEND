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

interface SetInput {
  weight: number;
  reps: number;
}

interface ExerciseInWorkout {
  exerciseId: string;
  sets: SetInput[];
}

let baseUrl: string;
let server: Server;
const testEmails = new Set<string>();

async function request(path: string, options: RequestInit = {}): Promise<ApiResponse> {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = response.status === 204 ? {} : await response.json() as Record<string, unknown>;
  return { body, status: response.status };
}

/**
 * Registers a fresh user and returns its access token, email and id.
 */
async function registerUser(label: string): Promise<{ accessToken: string; userId: string }> {
  const email = `progress.${label}.${randomUUID()}@ascend.test`;
  testEmails.add(email);
  const response = await request('/auth/register', {
    body: JSON.stringify({ email, password: 'A secure automated progress test 2026' }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });
  assert.equal(response.status, 201);
  const user = response.body.user as Record<string, string>;
  return { accessToken: response.body.accessToken as string, userId: user.id };
}

async function createExercise(userId: string, primaryMuscleGroups: string[], targetMuscleGroups: string[]): Promise<string> {
  const exercise = await prisma.exercise.create({
    data: {
      name: `Progress test exercise ${randomUUID()}`,
      primaryMuscleGroups,
      targetMuscleGroups,
      createdByUserId: userId,
    },
    select: { id: true },
  });
  return exercise.id;
}

// UTC-based so a "today" workout lands exactly on UTC midnight, matching the
// YYYY-MM-DD date strings the statistics dateFrom/dateTo filters are coerced to.
function daysAgo(days: number, hour = 8): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - days, hour));
}

async function createCompletedWorkout(userId: string, startedAt: Date, exercises: ExerciseInWorkout[]): Promise<void> {
  await prisma.workout.create({
    data: {
      userId,
      status: 'completed',
      startedAt,
      completedAt: new Date(startedAt.getTime() + 60 * 60 * 1000),
      workoutExercises: {
        create: exercises.map((exercise, index) => ({
          position: index + 1,
          exerciseId: exercise.exerciseId,
          sets: {
            create: exercise.sets.map((set, setIndex) => ({
              setNumber: setIndex + 1,
              weight: set.weight,
              repetitions: set.reps,
              isCompleted: true,
            })),
          },
        })),
      },
    },
  });
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

describe('progress endpoints', () => {
  it('aggregates weekly muscle sets from completed workouts only', async () => {
    const { accessToken, userId } = await registerUser('aggregate');
    const headers = { authorization: `Bearer ${accessToken}` };
    const exerciseId = await createExercise(userId, ['Pecho'], ['Chest']);

    // Today: 2 completed sets on 'Pecho' (volume 360). completedAt = now (+1h)
    // stays inside the local "this week"/"today" window in any timezone.
    await createCompletedWorkout(userId, new Date(), [
      { exerciseId, sets: [{ weight: 20, reps: 10 }, { weight: 20, reps: 8 }] },
    ]);

    // 20 days ago: another completed workout on the same muscle (volume 100).
    await createCompletedWorkout(userId, daysAgo(20), [
      { exerciseId, sets: [{ weight: 10, reps: 10 }] },
    ]);

    // An active (not completed) workout today must be excluded.
    await prisma.workout.create({
      data: {
        userId,
        status: 'active',
        startedAt: daysAgo(0, 1),
        workoutExercises: {
          create: [{
            position: 1,
            exerciseId,
            sets: { create: [{ setNumber: 1, weight: 50, repetitions: 5, isCompleted: true }] },
          }],
        },
      },
    });

    const response = await request('/progress/weekly-muscle-sets', { headers });
    assert.equal(response.status, 200);
    const body = response.body as { data: Array<Record<string, unknown>>; totalWeeklySets: number; totalDailySets: number };

    assert.equal(body.data.length, 1);
    const chest = body.data.find((item) => item.muscleGroup === 'Pecho');
    assert.ok(chest, 'Pecho should appear in weekly muscle sets');
    assert.equal(chest.weeklySets, 2);
    assert.equal(chest.weeklyVolume, 360);
    assert.equal(chest.dailySets, 2);
    assert.equal(chest.dailyVolume, 360);
    assert.equal(chest.totalSets, 3);
    assert.equal(chest.totalVolume, 460);
    assert.equal(chest.frequencyThisWeek, 1);

    assert.equal(body.totalWeeklySets, 2);
    assert.equal(body.totalDailySets, 2);
  });

  it('attributes a workout at the exact UTC-Monday boundary to the current week (case #6)', async () => {
    const { accessToken, userId } = await registerUser('boundary');
    const headers = { authorization: `Bearer ${accessToken}` };
    const exerciseId = await createExercise(userId, ['Pecho'], ['Chest']);

    // Current UTC calendar week (Monday 00:00). This is the same convention the
    // statistics/chart endpoints use; weekly-muscle-sets must not drift with the
    // server's local timezone.
    const now = new Date();
    const weekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    weekStart.setUTCDate(weekStart.getUTCDate() - ((weekStart.getUTCDay() + 6) % 7));

    // One workout at exactly 00:00:00.000 UTC Monday (start of the current week).
    await createCompletedWorkout(userId, weekStart, [
      { exerciseId, sets: [{ weight: 20, reps: 10 }] },
    ]);

    // Another one one hour earlier (Sunday 23:00 UTC of the previous week), so
    // its completedAt (startedAt + 1h) stays before the UTC-Monday boundary.
    await createCompletedWorkout(userId, new Date(weekStart.getTime() - 60 * 60 * 1000 - 1), [
      { exerciseId, sets: [{ weight: 40, reps: 5 }] },
    ]);

    const response = await request('/progress/weekly-muscle-sets', { headers });
    assert.equal(response.status, 200);
    const body = response.body as { data: Array<Record<string, unknown>>; totalWeeklySets: number; totalDailySets: number };

    assert.equal(body.totalWeeklySets, 1, 'only the Monday-boundary workout belongs to this week');
    const chest = body.data.find((item) => item.muscleGroup === 'Pecho');
    assert.ok(chest, 'Pecho should appear in weekly muscle sets');
    assert.equal(chest.weeklySets, 1);
    assert.equal(chest.weeklyVolume, 200);
    assert.equal(chest.totalSets, 2, 'both workouts accumulate into lifetime totals');
    assert.equal(chest.totalVolume, 400);

    // Coherence with the statistics endpoint: both workouts exist, only one is "this week".
    const statistics = await request('/progress/statistics', { headers });
    assert.equal((statistics.body.statistics as Record<string, number>).totalWorkouts, 2);
  });

  it('computes statistics with and without a date window', async () => {
    const { accessToken, userId } = await registerUser('statistics');
    const headers = { authorization: `Bearer ${accessToken}` };
    const exerciseId = await createExercise(userId, ['Pecho'], ['Chest']);

    const today = daysAgo(0, 0);
    await createCompletedWorkout(userId, today, [
      { exerciseId, sets: [{ weight: 20, reps: 10 }, { weight: 20, reps: 8 }] },
    ]);
    await createCompletedWorkout(userId, daysAgo(20), [
      { exerciseId, sets: [{ weight: 10, reps: 10 }] },
    ]);

    const todayKey = today.toISOString().slice(0, 10);

    // Unfiltered: everything the user completed counts.
    const all = await request('/progress/statistics', { headers });
    assert.equal(all.status, 200);
    const allStatistics = all.body.statistics as Record<string, number>;
    assert.equal(allStatistics.totalWorkouts, 2);
    assert.equal(allStatistics.totalVolume, 460);
    assert.equal(allStatistics.totalSets, 3);
    assert.equal(allStatistics.totalRepetitions, 28);
    // Records accumulate over every completed workout (4 per breakthrough per set), regardless of the window.
    assert.equal(allStatistics.personalRecords, 8);

    // Filtered to today: only the workout started today counts.
    const filtered = await request(`/progress/statistics?dateFrom=${todayKey}&dateTo=${todayKey}`, { headers });
    assert.equal(filtered.status, 200);
    assert.deepEqual(filtered.body.statistics, {
      totalWorkouts: 1,
      workoutFrequency: 1,
      totalVolume: 360,
      totalSets: 2,
      totalRepetitions: 18,
      personalRecords: 8,
    });

    // An inverted range is rejected.
    const inverted = await request(`/progress/statistics?dateFrom=${todayKey}&dateTo=2000-01-01`, { headers });
    assert.equal(inverted.status, 400);
    assert.equal((inverted.body.error as Record<string, string>).code, 'VALIDATION_ERROR');
  });

  it('exposes no progress data to another user', async () => {
    const { userId: ownerId } = await registerUser('owner');
    const exerciseId = await createExercise(ownerId, ['Pecho'], ['Chest']);
    await createCompletedWorkout(ownerId, daysAgo(0, 0), [
      { exerciseId, sets: [{ weight: 20, reps: 10 }] },
    ]);

    const { accessToken: strangerToken } = await registerUser('stranger');
    const headers = { authorization: `Bearer ${strangerToken}` };

    const weekly = await request('/progress/weekly-muscle-sets', { headers });
    assert.equal(weekly.status, 200);
    const weeklyBody = weekly.body as { data: Array<unknown>; totalWeeklySets: number; totalDailySets: number };
    assert.deepEqual(weeklyBody.data, []);
    assert.equal(weeklyBody.totalWeeklySets, 0);
    assert.equal(weeklyBody.totalDailySets, 0);

    const muscleGroups = await request('/progress/muscle-groups', { headers });
    assert.equal(muscleGroups.status, 200);
    assert.deepEqual((muscleGroups.body as { data: Array<unknown> }).data, []);

    const statistics = await request('/progress/statistics', { headers });
    assert.equal(statistics.status, 200);
    assert.deepEqual(statistics.body.statistics, {
      totalWorkouts: 0,
      workoutFrequency: 0,
      totalVolume: 0,
      totalSets: 0,
      totalRepetitions: 0,
      personalRecords: 0,
    });
    assert.ok(true);
  });
});