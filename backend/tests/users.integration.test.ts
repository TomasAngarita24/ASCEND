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
  const email = `users.automated.${randomUUID()}@ascend.test`;
  testEmails.add(email);
  const response = await request('/auth/register', {
    body: JSON.stringify({ email, password: 'A secure automated users test 2026' }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });
  assert.equal(response.status, 201);
  return response.body.accessToken as string;
}

async function setCompletedWorkout(accessToken: string): Promise<void> {
  const headers = { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' };
  const exercise = await request('/exercises', {
    body: JSON.stringify({ name: `Users exercise ${randomUUID()}`, targetMuscleGroups: ['Chest'] }),
    headers,
    method: 'POST',
  });
  const exerciseId = (exercise.body.exercise as Record<string, string>).id;

  const started = await request('/workouts', { body: '{}', headers, method: 'POST' });
  const workoutId = (started.body.workout as Record<string, string>).id;

  const addedEx = await request(`/workouts/${workoutId}/exercises`, {
    body: JSON.stringify({ exerciseId }), headers, method: 'POST',
  });
  const workoutExerciseId = (addedEx.body.workoutExercise as Record<string, string>).id;

  const set = await request(`/workouts/${workoutId}/exercises/${workoutExerciseId}/sets`, {
    body: JSON.stringify({ weight: 60, repetitions: 10, isCompleted: true }), headers, method: 'POST',
  });
  assert.equal(set.status, 201);

  const completed = await request(`/workouts/${workoutId}/complete`, { headers, method: 'POST' });
  assert.equal(completed.status, 200);
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

describe('public profiles and follows', () => {
  it('returns a public profile with stats and rejects following yourself', async () => {
    const viewer = await registerAndGetAccessToken();
    const target = await registerAndGetAccessToken();
    await setCompletedWorkout(target);

    const me = await request('/auth/me', { headers: { authorization: `Bearer ${viewer}` } });
    const viewerId = (me.body.user as Record<string, string>).id;

    const targetProfileReq = await request('/auth/me', { headers: { authorization: `Bearer ${target}` } });
    const targetId = (targetProfileReq.body.user as Record<string, string>).id;

    const profile = await request(`/users/${targetId}/profile`, {
      headers: { authorization: `Bearer ${viewer}` },
    });
    assert.equal(profile.status, 200);
    const body = profile.body as Record<string, unknown>;
    assert.equal(body.isSelf, false);
    assert.equal(body.isFollowing, false);
    assert.equal((body.stats as Record<string, number>).workoutsCompleted, 1);

    const selfProfile = await request(`/users/${viewerId}/profile`, {
      headers: { authorization: `Bearer ${viewer}` },
    });
    assert.equal((selfProfile.body as Record<string, unknown>).isSelf, true);

    const selfFollow = await request(`/users/${viewerId}/follow`, {
      headers: { authorization: `Bearer ${viewer}` }, method: 'POST',
    });
    assert.equal(selfFollow.status, 400);
    assert.equal((selfFollow.body.error as Record<string, string>).code, 'CANNOT_FOLLOW_SELF');
  });

  it('follows, unfollows and reflects counts in profile and lists', async () => {
    const viewer = await registerAndGetAccessToken();
    const target = await registerAndGetAccessToken();
    const frontRow = await registerAndGetAccessToken();

    const me = await request('/auth/me', { headers: { authorization: `Bearer ${viewer}` } });
    const viewerId = (me.body.user as Record<string, string>).id;
    const profileReq = await request('/auth/me', { headers: { authorization: `Bearer ${target}` } });
    const targetId = (profileReq.body.user as Record<string, string>).id;
    const frontReq = await request('/auth/me', { headers: { authorization: `Bearer ${frontRow}` } });
    const frontId = (frontReq.body.user as Record<string, string>).id;

    const followed = await request(`/users/${targetId}/follow`, {
      headers: { authorization: `Bearer ${viewer}` }, method: 'POST',
    });
    assert.equal(followed.status, 200);
    assert.equal((followed.body as Record<string, unknown>).following, true);

    const profileAfter = await request(`/users/${targetId}/profile`, {
      headers: { authorization: `Bearer ${viewer}` },
    });
    const afterBody = profileAfter.body as Record<string, unknown>;
    assert.equal(afterBody.isFollowing, true);
    assert.equal(afterBody.followersCount, 1);

    const frontFollow = await request(`/users/${viewerId}/follow`, {
      headers: { authorization: `Bearer ${frontRow}` }, method: 'POST',
    });
    assert.equal(frontFollow.status, 200);

    const followers = await request(`/users/${viewerId}/followers`, {
      headers: { authorization: `Bearer ${viewer}` },
    });
    assert.equal(followers.status, 200);
    const followersData = followers.body.data as Array<{ id: string }>;
    assert.equal(followersData.length, 1);
    assert.equal(followersData[0].id, frontId);

    const following = await request(`/users/${viewerId}/following`, {
      headers: { authorization: `Bearer ${viewer}` },
    });
    const followingData = following.body.data as Array<{ id: string }>;
    assert.equal(followingData.length, 1);
    assert.equal(followingData[0].id, targetId);

    const unliked = await request(`/users/${targetId}/follow`, {
      headers: { authorization: `Bearer ${viewer}` }, method: 'DELETE',
    });
    assert.equal(unliked.status, 200);
    assert.equal((unliked.body as Record<string, unknown>).following, false);

    const profileUnfollow = await request(`/users/${targetId}/profile`, {
      headers: { authorization: `Bearer ${viewer}` },
    });
    const unfollowBody = profileUnfollow.body as Record<string, unknown>;
    assert.equal(unfollowBody.isFollowing, false);
    assert.equal(unfollowBody.followersCount, 0);
  });

  it('returns 404 for unknown users', async () => {
    const viewer = await registerAndGetAccessToken();
    const unknownId = '00000000-0000-0000-0000-000000000000';

    const profile = await request(`/users/${unknownId}/profile`, {
      headers: { authorization: `Bearer ${viewer}` },
    });
    assert.equal(profile.status, 404);
    assert.equal((profile.body.error as Record<string, string>).code, 'USER_NOT_FOUND');

    const follow = await request(`/users/${unknownId}/follow`, {
      headers: { authorization: `Bearer ${viewer}` }, method: 'POST',
    });
    assert.equal(follow.status, 404);
  });

  it('searches for users by name and excludes the viewer', async () => {
    const searcher = await registerAndGetAccessToken();
    const maria = await registerAndGetAccessToken();
    const marco = await registerAndGetAccessToken();

    const mariaHeaders = { authorization: `Bearer ${maria}`, 'content-type': 'application/json' };
    const marcoHeaders = { authorization: `Bearer ${marco}`, 'content-type': 'application/json' };
    const updatedMaria = await request('/auth/me', {
      body: JSON.stringify({ fullName: 'Maria González' }), headers: mariaHeaders, method: 'PATCH',
    });
    assert.equal(updatedMaria.status, 200);
    const updatedMarco = await request('/auth/me', {
      body: JSON.stringify({ fullName: 'Marco Pérez' }), headers: marcoHeaders, method: 'PATCH',
    });
    assert.equal(updatedMarco.status, 200);
    const mariaId = (updatedMaria.body.user as Record<string, string>).id;
    const marcoId = (updatedMarco.body.user as Record<string, string>).id;

    const empty = await request('/users/search?q='.concat(''), {
      headers: { authorization: `Bearer ${searcher}` },
    });
    assert.equal((empty.body.data as unknown[]).length, 0);

    const results = await request('/users/search?q=Maria', {
      headers: { authorization: `Bearer ${searcher}` },
    });
    assert.equal(results.status, 200);
    const data = results.body.data as Array<{ id: string; fullName: string | null; isFollowing: boolean }>;
    assert.equal(data.length, 1);
    assert.equal(data[0].id, mariaId);
    assert.equal(data[0].fullName, 'Maria González');
    assert.equal(data[0].isFollowing, false);

    const followed = await request(`/users/${mariaId}/follow`, {
      headers: { authorization: `Bearer ${searcher}` }, method: 'POST',
    });
    assert.equal(followed.status, 200);

    const resultsAfterFollow = await request('/users/search?q=maria', {
      headers: { authorization: `Bearer ${searcher}` },
    });
    const dataAfter = resultsAfterFollow.body.data as Array<{ id: string; isFollowing: boolean }>;
    assert.equal(dataAfter[0].isFollowing, true);

    const broad = await request('/users/search?q=Mar', {
      headers: { authorization: `Bearer ${searcher}` },
    });
    const broadIds = (broad.body.data as Array<{ id: string }>).map((row) => row.id).sort();
    assert.deepEqual(broadIds, [mariaId, marcoId].sort());

    const self = await request('/auth/me', { headers: { authorization: `Bearer ${searcher}` } });
    const searcherId = (self.body.user as Record<string, string>).id;
    const broadRows = broad.body.data as Array<{ id: string }>;
    assert.equal(broadRows.some((row) => row.id === searcherId), false);
  });
});