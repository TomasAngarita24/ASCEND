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
  const email = `social.automated.${randomUUID()}@ascend.test`;
  testEmails.add(email);
  const response = await request('/auth/register', {
    body: JSON.stringify({ email, password: 'A secure automated social test 2026' }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });
  assert.equal(response.status, 201);
  return response.body.accessToken as string;
}

async function setUpCompletedWorkout(accessToken: string): Promise<string> {
  const headers = { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' };
  const exercise = await request('/exercises', {
    body: JSON.stringify({ name: `Social exercise ${randomUUID()}`, targetMuscleGroups: ['Chest'] }),
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
  return workoutId;
}

async function setUpCompletedWorkoutWithExercise(accessToken: string, exerciseId: string, weight: number): Promise<string> {
  const headers = { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' };

  const started = await request('/workouts', { body: '{}', headers, method: 'POST' });
  const workoutId = (started.body.workout as Record<string, string>).id;

  const addedEx = await request(`/workouts/${workoutId}/exercises`, {
    body: JSON.stringify({ exerciseId }), headers, method: 'POST',
  });
  const workoutExerciseId = (addedEx.body.workoutExercise as Record<string, string>).id;

  const set = await request(`/workouts/${workoutId}/exercises/${workoutExerciseId}/sets`, {
    body: JSON.stringify({ weight, repetitions: 10, isCompleted: true }), headers, method: 'POST',
  });
  assert.equal(set.status, 201);

  const completed = await request(`/workouts/${workoutId}/complete`, { headers, method: 'POST' });
  assert.equal(completed.status, 200);
  return workoutId;
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

describe('social feed', () => {
  it('shares a completed workout, hydrates the feed, and likes/unlikes it', async () => {
    const accessToken = await registerAndGetAccessToken();
    const headers = { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' };
    const workoutId = await setUpCompletedWorkout(accessToken);

    const shared = await request(`/workouts/${workoutId}/share`, {
      body: JSON.stringify({ caption: 'Gran sesión de pecho' }),
      headers,
      method: 'POST',
    });
    assert.equal(shared.status, 201);
    const post = shared.body.post as Record<string, unknown>;
    assert.equal(post.postType, 'workout');
    assert.equal(post.caption, 'Gran sesión de pecho');
    assert.equal(post.imageUrl, null);
    assert.equal(post.prAchieved, false);

    const feed = await request('/social/feed?page=1&limit=20', {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    assert.equal(feed.status, 200);
    const data = feed.body.data as Array<Record<string, unknown>>;
    const feedPost = data.find((item) => item.id === post.id);
    assert.ok(feedPost, 'shared workout should appear in the feed');
    const workout = feedPost.workout as Record<string, unknown>;
    assert.equal(workout.id, workoutId);
    assert.equal((workout as { totalVolume?: number }).totalVolume, 600);
    assert.equal(((workout.exercises as Array<Record<string, unknown>>)[0].name as string).length > 0, true);
    assert.equal(feedPost.likeCount, 0);
    assert.equal(feedPost.likedByMe, false);

    const liked = await request(`/social/posts/${post.id as string}/likes`, {
      headers: { authorization: `Bearer ${accessToken}` }, method: 'POST',
    });
    assert.equal(liked.status, 204);

    const feedAfterLike = await request('/social/feed', {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    const feedData = feedAfterLike.body.data as Array<Record<string, unknown>>;
    const likedPost = feedData.find((item) => item.id === post.id);
    assert.ok(likedPost, 'liked post should still be in the feed');
    assert.equal(likedPost.likeCount, 1);
    assert.equal(likedPost.likedByMe, true);

    const unliked = await request(`/social/posts/${post.id as string}/likes`, {
      headers: { authorization: `Bearer ${accessToken}` }, method: 'DELETE',
    });
    assert.equal(unliked.status, 204);
  });

  it('rejects sharing a workout that is not yours or not completed', async () => {
    const ownerToken = await registerAndGetAccessToken();
    const otherToken = await registerAndGetAccessToken();
    const workoutId = await setUpCompletedWorkout(ownerToken);

    const notYours = await request(`/workouts/${workoutId}/share`, {
      body: '{}', headers: { authorization: `Bearer ${otherToken}`, 'content-type': 'application/json' }, method: 'POST',
    });
    assert.equal(notYours.status, 404);
    assert.equal((notYours.body.error as Record<string, string>).code, 'WORKOUT_NOT_FOUND');

    const started = await request('/workouts', {
      body: '{}', headers: { authorization: `Bearer ${ownerToken}`, 'content-type': 'application/json' }, method: 'POST',
    });
    const activeWorkoutId = (started.body.workout as Record<string, string>).id;
    const activeShare = await request(`/workouts/${activeWorkoutId}/share`, {
      body: '{}', headers: { authorization: `Bearer ${ownerToken}`, 'content-type': 'application/json' }, method: 'POST',
    });
    assert.equal(activeShare.status, 404);
  });

  it('lets the author delete their own post', async () => {
    const accessToken = await registerAndGetAccessToken();
    const workoutId = await setUpCompletedWorkout(accessToken);
    const headers = { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' };
    const shared = await request(`/workouts/${workoutId}/share`, { body: '{}', headers, method: 'POST' });
    const postId = (shared.body.post as Record<string, string>).id;

    const deleted = await request(`/social/posts/${postId}`, {
      headers: { authorization: `Bearer ${accessToken}` }, method: 'DELETE',
    });
    assert.equal(deleted.status, 204);

    const feed = await request('/social/feed', {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    const feedIds = (feed.body.data as Array<Record<string, unknown>>).map((post) => post.id);
    assert.equal(feedIds.includes(postId), false);
  });

  it('stores an optional image on a workout post', async () => {
    const accessToken = await registerAndGetAccessToken();
    const workoutId = await setUpCompletedWorkout(accessToken);
    const headers = { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' };

    const shared = await request(`/workouts/${workoutId}/share`, {
      body: JSON.stringify({ imageUrl: 'data:image/jpeg;base64,Zm9v' }),
      headers,
      method: 'POST',
    });
    assert.equal(shared.status, 201);
    assert.equal((shared.body.post as Record<string, unknown>).imageUrl, 'data:image/jpeg;base64,Zm9v');
    assert.equal((shared.body.post as Record<string, unknown>).prAchieved, false);

    const invalidImage = await request(`/workouts/${workoutId}/share`, {
      body: JSON.stringify({ imageUrl: 'file://tmp/image.png' }),
      headers,
      method: 'POST',
    });
    assert.equal(invalidImage.status, 400);
  });

  it('marks a workout post as PR when the session beats previous bests', async () => {
    const accessToken = await registerAndGetAccessToken();
    const headers = { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' };

    const exercise = await request('/exercises', {
      body: JSON.stringify({ name: `PR exercise ${randomUUID()}`, targetMuscleGroups: ['Chest'] }),
      headers,
      method: 'POST',
    });
    const exerciseId = (exercise.body.exercise as Record<string, string>).id;

    const workoutId = await setUpCompletedWorkoutWithExercise(accessToken, exerciseId, 60);
    const prWorkoutId = await setUpCompletedWorkoutWithExercise(accessToken, exerciseId, 80);

    const shared = await request(`/workouts/${workoutId}/share`, {
      body: '{}',
      headers,
      method: 'POST',
    });
    assert.equal((shared.body.post as Record<string, unknown>).prAchieved, false);

    const sharedPR = await request(`/workouts/${prWorkoutId}/share`, {
      body: '{}',
      headers,
      method: 'POST',
    });
    assert.equal(sharedPR.status, 201);
    assert.equal((sharedPR.body.post as Record<string, unknown>).prAchieved, true);
  });

  it('lists a user\'s published posts for another authenticated user', async () => {
    const authorToken = await registerAndGetAccessToken();
    const viewerToken = await registerAndGetAccessToken();
    const workoutId = await setUpCompletedWorkout(authorToken);
    const authorMe = await request('/auth/me', { headers: { authorization: `Bearer ${authorToken}` } });
    const authorId = (authorMe.body.user as Record<string, string>).id;

    const shared = await request(`/workouts/${workoutId}/share`, {
      body: JSON.stringify({ caption: 'Mi sesión pública' }),
      headers: { authorization: `Bearer ${authorToken}`, 'content-type': 'application/json' },
      method: 'POST',
    });
    const sharedPostId = (shared.body.post as Record<string, string>).id;

    const posts = await request(`/users/${authorId}/posts?page=1&limit=20`, {
      headers: { authorization: `Bearer ${viewerToken}` },
    });
    assert.equal(posts.status, 200);
    const data = posts.body.data as Array<Record<string, unknown>>;
    assert.equal(data.length, 1);
    assert.equal(data[0].id, sharedPostId);
    assert.equal(data[0].caption, 'Mi sesión pública');
    assert.equal((data[0] as { prAchieved?: boolean }).prAchieved, false);
    assert.equal(posts.body.pagination.total, 1);

    const unknownUserPosts = await request(`/users/${randomUUID()}/posts`, {
      headers: { authorization: `Bearer ${viewerToken}` },
    });
    assert.equal(unknownUserPosts.status, 404);
  });
});